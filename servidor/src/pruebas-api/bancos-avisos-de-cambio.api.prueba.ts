import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { ReglaDeNegocioInfringida } from '../modulos/core/compartido/dominio/errores.js';
import '../modulos/core/contratos/bancos.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral, saldoDe } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  cuentaConChequera,
  MODULOS_CON_CUENTAS_POR_PAGAR,
  movimientoDe,
  operadorDeLaCuenta,
} from './soporte/ordenes-de-bancos.js';

class PagoLigado extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_ligado_a_pagos';

  constructor() {
    super('La nota está aplicada a un pago.');
  }
}

interface AvisoVisto {
  cambio: string;
  movimientoId: string;
  forma: string | null;
  motivo: string | null;
  modulo: string | null;
}

const entorno = usarEntornoApi();
const FECHA = '2026-02-10';
const MOTIVO = 'Se pidió por error';
let cuenta: CuentaDePrueba;
let sinModulo: CuentaDePrueba;
let operador: Operador;
let cuentaBancariaId = '';
let chequeraId = '';
let conceptoId = '';
let visto: AvisoVisto[] = [];
let rechazar = false;

const pago = (centavos: number) => [{ claveDeSistema: 'pago_a_proveedor' as const, montoCentavos: centavos }];
const origen = () => ({ modulo: 'cuentas-por-pagar', documentoId: crypto.randomUUID() });
const emitir = (fecha = FECHA) =>
  mediador.enviar(operador, 'bancos.emitir_cheque_de_origen', {
    origen: origen(),
    chequeraId,
    fecha,
    montoCentavos: 10000,
    beneficiario: 'Proveedor S.A.',
    noNegociable: true,
    conceptos: pago(10000),
  });
const registrarNota = () =>
  mediador.enviar(operador, 'bancos.registrar_nota_de_origen', {
    origen: origen(),
    cuentaBancariaId,
    tipo: 'debito',
    fecha: FECHA,
    montoCentavos: 5000,
    beneficiario: 'Proveedor S.A.',
    conceptos: pago(5000),
  });
const datosDeNota = (cambios: Record<string, unknown> = {}) => ({
  cuentaBancariaId,
  tipo: 'debito',
  fecha: FECHA,
  monto: '50.00',
  referencia: 'Corregida',
  beneficiario: 'Proveedor S.A.',
  observaciones: null,
  conceptoId,
  ...cambios,
});

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Avisos',
    usuario: 'propietarioavisos',
    modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
  });
  sinModulo = await darDeAltaCuenta(entorno, {
    nombre: 'Sin modulo',
    usuario: 'propietariosinmodulo',
    modulos: ['bancos'],
  });
  operador = await operadorDeLaCuenta(cuenta);
  conceptoId = await conceptoGeneral(cuenta.propietario);
  ({ cuentaBancariaId, chequeraId } = await cuentaConChequera(cuenta.propietario, 'Cuenta de avisos'));
  mediador.escuchar('cuentas-por-pagar', 'bancos.movimiento_por_cambiar', async (aviso) => {
    visto.push({
      cambio: aviso.cambio,
      movimientoId: aviso.movimientoId,
      forma: aviso.formaDeAnulacion,
      motivo: aviso.motivo,
      modulo: aviso.moduloDeOrigen,
    });
    if (rechazar) throw new PagoLigado();
  });
});

beforeEach(() => {
  visto = [];
  rechazar = false;
});

afterAll(() => {
  mediador.retirarManejadoresDe('cuentas-por-pagar');
});

describe('anular desde Bancos un movimiento de otro módulo', () => {
  it('un cheque de mes abierto avisa «anular» sin inverso y se anula a la antigua', async () => {
    const cheque = await emitir();

    const anulado = await cuenta.propietario.post(`/api/bancos/cheques/${cheque.chequeId}/anular`, { motivo: MOTIVO });

    expect(anulado.estado).toBe(200);
    expect(visto).toEqual([
      {
        cambio: 'anular',
        movimientoId: cheque.movimientoId,
        forma: 'sin_inverso',
        motivo: MOTIVO,
        modulo: 'cuentas-por-pagar',
      },
    ]);
  });

  it('si el módulo rechaza el aviso no se anula nada', async () => {
    const cheque = await emitir();
    rechazar = true;
    const antes = await saldoDe(cuenta.propietario, cuentaBancariaId);

    const anulado = await cuenta.propietario.post(`/api/bancos/cheques/${cheque.chequeId}/anular`, { motivo: MOTIVO });

    expect(anulado.estado).toBe(422);
    expect(anulado.cuerpo.error.codigo).toBe('movimiento_ligado_a_pagos');
    const lista = (await cuenta.propietario.get(`/api/bancos/cheques?cuentaBancariaId=${cuentaBancariaId}`)).cuerpo;
    expect(lista.find((c: { id: string }) => c.id === cheque.chequeId).estado).toBe('emitido');
    expect(await saldoDe(cuenta.propietario, cuentaBancariaId)).toBe(antes);
  });

  it('una nota avisa «anular» con inverso, y si el módulo rechaza queda como estaba', async () => {
    const nota = await registrarNota();
    rechazar = true;

    const rechazada = await cuenta.propietario.post(`/api/bancos/notas/${nota.movimientoId}/anular`, {
      motivo: MOTIVO,
    });
    rechazar = false;
    const anulada = await cuenta.propietario.post(`/api/bancos/notas/${nota.movimientoId}/anular`, { motivo: MOTIVO });

    expect(rechazada.estado).toBe(422);
    expect(anulada.estado).toBe(200);
    expect(visto.map((aviso) => [aviso.cambio, aviso.forma])).toEqual([
      ['anular', 'con_inverso'],
      ['anular', 'con_inverso'],
    ]);
  });

  it('la anulación en lote de cheques caducos avisa por cada cheque y el rechazo se informa como problema', async () => {
    const viejo = await emitir('2026-01-10');
    rechazar = true;

    const lote = await cuenta.propietario.post('/api/bancos/cheques/anular-en-lote', {
      chequeIds: [viejo.chequeId],
      motivo: 'Cheque caduco',
      fecha: '2026-09-01',
    });

    expect(lote.estado).toBe(422);
    expect(lote.cuerpo.error.detalles).toEqual([
      expect.objectContaining({ chequeId: viejo.chequeId, codigo: 'movimiento_ligado_a_pagos' }),
    ]);
    expect(visto).toEqual([expect.objectContaining({ cambio: 'anular', forma: 'con_inverso' })]);
  });
});

describe('corregir, eliminar y blanquear lo que generó otro módulo', () => {
  it('se avisa primero y, si el módulo lo deja pasar, Bancos lo rechaza por ser de otro módulo', async () => {
    const nota = await registrarNota();
    const cheque = await emitir();

    const corregida = await cuenta.propietario.put(`/api/bancos/notas/${nota.movimientoId}`, datosDeNota());
    const eliminada = await cuenta.propietario.delete(`/api/bancos/notas/${nota.movimientoId}`, { motivo: MOTIVO });
    const blanqueado = await cuenta.propietario.post(`/api/bancos/cheques/${cheque.chequeId}/blanquear`, {
      motivo: MOTIVO,
    });

    expect(visto.map((aviso) => aviso.cambio)).toEqual(['corregir', 'eliminar', 'blanquear']);
    for (const respuesta of [corregida, eliminada, blanqueado]) {
      expect(respuesta.estado).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('movimiento_de_otro_modulo');
    }
    const cuerpo = await movimientoDe(cuenta.propietario, nota.movimientoId);
    expect(cuerpo).toMatchObject({ puedeEliminar: false, referencia: null });
  });

  it('si el módulo rechaza el aviso, ese es el error que ve quien lo pidió', async () => {
    const nota = await registrarNota();
    rechazar = true;

    const eliminada = await cuenta.propietario.delete(`/api/bancos/notas/${nota.movimientoId}`, { motivo: MOTIVO });

    expect(eliminada.cuerpo.error.codigo).toBe('movimiento_ligado_a_pagos');
  });

  it('con Cuentas por pagar inactivo no se anula, elimina, corrige ni blanquea lo suyo', async () => {
    const bancos = await cuentaConChequera(sinModulo.propietario, 'Cuenta sin modulo');
    const operadorSinModulo = await operadorDeLaCuenta(sinModulo);
    const nota = await mediador.enviar({ ...operadorSinModulo }, 'bancos.registrar_nota_de_origen', {
      origen: origen(),
      cuentaBancariaId: bancos.cuentaBancariaId,
      tipo: 'debito',
      fecha: FECHA,
      montoCentavos: 5000,
      beneficiario: 'Proveedor S.A.',
      conceptos: pago(5000),
    });
    const cheque = await mediador.enviar(operadorSinModulo, 'bancos.emitir_cheque_de_origen', {
      origen: origen(),
      chequeraId: bancos.chequeraId,
      fecha: FECHA,
      montoCentavos: 10000,
      beneficiario: 'Proveedor S.A.',
      noNegociable: true,
      conceptos: pago(10000),
    });

    const respuestas = [
      await sinModulo.propietario.post(`/api/bancos/notas/${nota.movimientoId}/anular`, { motivo: MOTIVO }),
      await sinModulo.propietario.delete(`/api/bancos/notas/${nota.movimientoId}`, { motivo: MOTIVO }),
      await sinModulo.propietario.put(
        `/api/bancos/notas/${nota.movimientoId}`,
        datosDeNota({ cuentaBancariaId: bancos.cuentaBancariaId }),
      ),
      await sinModulo.propietario.post(`/api/bancos/cheques/${cheque.chequeId}/anular`, { motivo: MOTIVO }),
      await sinModulo.propietario.post(`/api/bancos/cheques/${cheque.chequeId}/blanquear`, { motivo: MOTIVO }),
    ];

    for (const respuesta of respuestas) {
      expect(respuesta.estado).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('modulo_de_origen_inactivo');
    }
    expect(visto).toEqual([]);
  });

  it('un movimiento sin origen ni marca no avisa a nadie', async () => {
    const conceptos = (await cuenta.propietario.get('/api/bancos/conceptos')).cuerpo as Array<{
      id: string;
      claveDeSistema: string | null;
    }>;
    const nota = await cuenta.propietario.post(
      '/api/bancos/notas',
      datosDeNota({ conceptoId: conceptos.find((c) => c.claveDeSistema === null)!.id, referencia: null }),
    );

    const eliminada = await cuenta.propietario.delete(`/api/bancos/notas/${nota.cuerpo.id}`, { motivo: MOTIVO });

    expect(eliminada.estado).toBe(204);
    expect(visto).toEqual([]);
    const restos = await comoPropietario('select 1 from bancos.movimientos where id = $1', [nota.cuerpo.id]);
    expect(restos).toHaveLength(0);
  });
});
