import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ReglaDeNegocioInfringida } from '../modulos/core/compartido/dominio/errores.js';
import '../modulos/core/contratos/bancos.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral, terminarConciliacionConSaldo } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  auditoriaDe,
  cuentaConChequera,
  MODULOS_CON_CUENTAS_POR_PAGAR,
  movimientoDe,
} from './soporte/ordenes-de-bancos.js';

class NotaLigada extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_ligado_a_pagos';

  constructor() {
    super('La nota está aplicada a un pago.');
  }
}

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId = '';
let conceptoId = '';
let conciliacionId = '';
let avisos: string[] = [];
let rechazar = false;

const nota = async (cambios: Record<string, unknown> = {}) =>
  (
    await cuenta.propietario.post('/api/bancos/notas', {
      cuentaBancariaId,
      tipo: 'debito',
      fecha: '2026-01-10',
      monto: '80.00',
      referencia: null,
      beneficiario: 'Seguros S.A.',
      observaciones: null,
      conceptoId,
      ...cambios,
    })
  ).cuerpo.id as string;

const notaMarcada = async (cambios: Record<string, unknown> = {}) => {
  const id = await nota(cambios);
  await cuenta.propietario.post(`/api/bancos/notas/${id}/marcar`, {});
  return id;
};

const desmarcar = (movimientoId: string, cambios: Record<string, unknown> = {}) =>
  cuenta.propietario.post(`/api/bancos/conciliaciones/${conciliacionId}/notas/${movimientoId}/desmarcar`, {
    motivo: 'Sin factura que ligar al cierre',
    conceptoId,
    ...cambios,
  });

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Desmarcar en conciliacion',
    usuario: 'propietariodesmarcarconc',
    modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
  });
  conceptoId = await conceptoGeneral(cuenta.propietario);
  ({ cuentaBancariaId } = await cuentaConChequera(cuenta.propietario, 'Cuenta del cierre'));
  conciliacionId = (
    await cuenta.propietario.post('/api/bancos/conciliaciones', { cuentaBancariaId, anio: 2026, mes: 1 })
  ).cuerpo.id;
  mediador.escuchar('cuentas-por-pagar', 'bancos.movimiento_por_cambiar', async (aviso) => {
    avisos.push(aviso.cambio);
    if (rechazar) throw new NotaLigada();
  });
});

beforeEach(() => {
  avisos = [];
  rechazar = false;
});

afterAll(() => {
  mediador.retirarManejadoresDe('cuentas-por-pagar');
});

describe('desmarcar una nota desde la conciliación (CP4-B2b)', () => {
  it('una nota sin ligar pasa: avisa «desmarcar», cambia el concepto y deja la auditoría con el motivo', async () => {
    const id = await notaMarcada();

    const respuesta = await desmarcar(id);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ marcadaParaModulo: null, conceptoNombre: 'General de prueba' });
    expect(avisos).toEqual(['desmarcar']);
    expect(await auditoriaDe(id)).toContainEqual({
      accion: 'corregir',
      motivo: 'Sin factura que ligar al cierre',
      recurso: 'bancos.movimientos',
    });
  });

  it('una nota ligada a un pago se rechaza y sigue marcada, sin auditoría de más', async () => {
    const id = await notaMarcada();
    rechazar = true;

    const respuesta = await desmarcar(id);

    expect(respuesta.cuerpo.error.codigo).toBe('movimiento_ligado_a_pagos');
    expect((await movimientoDe(cuenta.propietario, id)).marcadaParaModulo).toBe('cuentas-por-pagar');
    expect(await auditoriaDe(id)).toHaveLength(1);
  });

  it('exige conciliar y editar notas', async () => {
    const id = await notaMarcada();
    const soloConciliar = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Concilia',
      permisos: ['bancos.conciliaciones.conciliar', 'bancos.notas.ver'],
    });

    const respuesta = await soloConciliar.post(`/api/bancos/conciliaciones/${conciliacionId}/notas/${id}/desmarcar`, {
      motivo: 'Intento',
      conceptoId,
    });

    expect(respuesta.estado).toBe(403);
    expect((await movimientoDe(cuenta.propietario, id)).marcadaParaModulo).toBe('cuentas-por-pagar');
  });

  it('solo en una conciliación en proceso y solo notas que sean candidatas del mes', async () => {
    const posterior = await notaMarcada({ fecha: '2026-03-10' });
    const id = await notaMarcada();

    const fueraDelMes = await desmarcar(posterior);
    await terminarConciliacionConSaldo(cuenta.propietario, conciliacionId);
    const terminada = await desmarcar(id);

    expect(fueraDelMes.cuerpo.error.codigo).toBe('movimiento_no_conciliable');
    expect(terminada.cuerpo.error.codigo).toBe('conciliacion_no_esta_en_proceso');
    expect(avisos).toEqual([]);
  });
});
