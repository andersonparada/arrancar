import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { ReglaDeNegocioInfringida } from '../modulos/core/compartido/dominio/errores.js';
import '../modulos/core/contratos/bancos.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  auditoriaDe,
  cuentaConChequera,
  desgloseDe,
  MODULOS_CON_CUENTAS_POR_PAGAR,
  movimientoDe,
  operadorDeLaCuenta,
} from './soporte/ordenes-de-bancos.js';

class NotaLigada extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_ligado_a_pagos';

  constructor() {
    super('La nota está aplicada a un pago.');
  }
}

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let sinModulo: CuentaDePrueba;
let operador: Operador;
let cuentaBancariaId = '';
let cuentaSinModulo = '';
let conceptoId = '';
let conceptoSinModulo = '';
let avisos: string[] = [];
let rechazar = false;

const datos = (cuentaId: string, cambios: Record<string, unknown> = {}) => ({
  cuentaBancariaId: cuentaId,
  tipo: 'debito',
  fecha: '2026-02-10',
  monto: '80.00',
  referencia: null,
  beneficiario: 'Seguros S.A.',
  observaciones: null,
  conceptoId: cuentaId === cuentaSinModulo ? conceptoSinModulo : conceptoId,
  ...cambios,
});
const nota = async (cambios: Record<string, unknown> = {}) =>
  (await cuenta.propietario.post('/api/bancos/notas', datos(cuentaBancariaId, cambios))).cuerpo.id as string;
const marcar = (id: string, usuario = cuenta.propietario) => usuario.post(`/api/bancos/notas/${id}/marcar`, {});
const desmarcar = (id: string, cambios: Record<string, unknown> = {}) =>
  cuenta.propietario.post(`/api/bancos/notas/${id}/desmarcar`, { motivo: 'Ya no se aplicará', conceptoId, ...cambios });
const repartir = (
  movimientoId: string,
  conceptos: Array<{ claveDeSistema: 'pago_a_proveedor' | 'pago_a_proveedor_de_activo'; montoCentavos: number }>,
) => mediador.enviar(operador, 'bancos.fijar_desglose_de_conceptos', { movimientoId, origen: null, conceptos });

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Marcas',
    usuario: 'propietariomarcas',
    modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
  });
  sinModulo = await darDeAltaCuenta(entorno, {
    nombre: 'Marcas sin modulo',
    usuario: 'propietariomarcasn',
    modulos: ['bancos'],
  });
  operador = await operadorDeLaCuenta(cuenta);
  conceptoId = await conceptoGeneral(cuenta.propietario);
  conceptoSinModulo = await conceptoGeneral(sinModulo.propietario);
  ({ cuentaBancariaId } = await cuentaConChequera(cuenta.propietario, 'Cuenta de marcas'));
  ({ cuentaBancariaId: cuentaSinModulo } = await cuentaConChequera(sinModulo.propietario, 'Cuenta sin modulo'));
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

describe('marcar una nota para Cuentas por pagar', () => {
  it('le pone el concepto «Pago a proveedores», lo muestra marcada y deja la auditoría con el concepto anterior', async () => {
    const id = await nota();
    const antes = await movimientoDe(cuenta.propietario, id);

    const marcada = await marcar(id);

    expect(marcada.estado).toBe(200);
    expect(marcada.cuerpo).toMatchObject({
      marcadaParaModulo: 'cuentas-por-pagar',
      conceptoNombre: 'Pago a proveedores',
      puedeMarcar: false,
      puedeDesmarcar: true,
      puedeReclasificar: true,
    });
    expect(antes).toMatchObject({ marcadaParaModulo: null, puedeMarcar: true, puedeDesmarcar: false });
    expect(await auditoriaDe(id)).toEqual([
      { accion: 'corregir', motivo: 'Marcada para Cuentas por pagar', recurso: 'bancos.movimientos' },
    ]);
  });

  it('se rechaza si ya está marcada, si no es de débito o si Cuentas por pagar no está activo', async () => {
    const id = await nota();
    await marcar(id);
    const credito = await nota({ tipo: 'credito' });
    const ajena = (await sinModulo.propietario.post('/api/bancos/notas', datos(cuentaSinModulo))).cuerpo;

    expect((await marcar(id)).cuerpo.error.codigo).toBe('nota_ya_marcada');
    expect((await marcar(credito)).cuerpo.error.codigo).toBe('nota_no_marcable');
    expect((await marcar(ajena.id, sinModulo.propietario)).cuerpo.error.codigo).toBe('cuentas_por_pagar_inactivo');
  });

  it('exige el permiso de editar notas', async () => {
    const id = await nota();
    const permisos = { nombres: 'Solo', apellidos: 'Lector', permisos: ['bancos.notas.ver'] };
    const soloVer = await crearUsuarioConPermisos(entorno, cuenta, permisos);

    expect((await marcar(id, soloVer)).estado).toBe(403);
    expect((await movimientoDe(cuenta.propietario, id)).marcadaParaModulo).toBeNull();
  });

  it('se puede registrar ya marcada, solo si es de débito y con el módulo activo', async () => {
    const creada = await cuenta.propietario.post(
      '/api/bancos/notas',
      datos(cuentaBancariaId, { conceptoId: undefined, marcarParaCuentasPorPagar: true }),
    );
    const credito = await cuenta.propietario.post(
      '/api/bancos/notas',
      datos(cuentaBancariaId, { tipo: 'credito', marcarParaCuentasPorPagar: true }),
    );
    const sinElModulo = await sinModulo.propietario.post(
      '/api/bancos/notas',
      datos(cuentaSinModulo, { conceptoId: undefined, marcarParaCuentasPorPagar: true }),
    );

    expect(creada.estado).toBe(201);
    expect(creada.cuerpo).toMatchObject({
      marcadaParaModulo: 'cuentas-por-pagar',
      conceptoNombre: 'Pago a proveedores',
    });
    expect(credito.cuerpo.error.codigo).toBe('nota_no_marcable');
    expect(sinElModulo.cuerpo.error.codigo).toBe('cuentas_por_pagar_inactivo');
  });
});

describe('desmarcar una nota', () => {
  it('avisa «desmarcar», pone el concepto elegido, quita el reparto y audita con el motivo y la nota como estaba', async () => {
    const id = await nota({ monto: '100.00' });
    await marcar(id);
    await repartir(id, [
      { claveDeSistema: 'pago_a_proveedor', montoCentavos: 4000 },
      { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 6000 },
    ]);
    avisos = [];

    const respuesta = await desmarcar(id, { motivo: 'Era de otro proveedor' });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      marcadaParaModulo: null,
      conceptoNombre: 'General de prueba',
      desglose: [],
      puedeMarcar: true,
    });
    expect(avisos).toEqual(['desmarcar']);
    expect(await desgloseDe(id)).toEqual([]);
    expect(await auditoriaDe(id)).toEqual([
      { accion: 'corregir', motivo: 'Marcada para Cuentas por pagar', recurso: 'bancos.movimientos' },
      { accion: 'corregir', motivo: 'Era de otro proveedor', recurso: 'bancos.movimientos' },
    ]);
  });

  it('si Cuentas por pagar la rechaza (nota ligada) sigue marcada y con su reparto', async () => {
    const id = await nota();
    await marcar(id);
    await repartir(id, [{ claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 8000 }]);
    rechazar = true;

    const respuesta = await desmarcar(id);

    expect(respuesta.cuerpo.error.codigo).toBe('movimiento_ligado_a_pagos');
    expect(await movimientoDe(cuenta.propietario, id)).toMatchObject({ marcadaParaModulo: 'cuentas-por-pagar' });
    expect(await desgloseDe(id)).toHaveLength(1);
  });

  it('pide motivo, un concepto que se pueda elegir y una nota marcada', async () => {
    const id = await nota();
    const marcada = await nota();
    await marcar(marcada);
    const deSistema = (await cuenta.propietario.get('/api/bancos/conceptos')).cuerpo.find(
      (c: { claveDeSistema: string | null }) => c.claveDeSistema === 'pago_a_proveedor',
    );

    expect((await desmarcar(id)).cuerpo.error.codigo).toBe('nota_no_marcada');
    expect((await desmarcar(marcada, { motivo: '   ' })).estado).toBe(400);
    expect((await desmarcar(marcada, { conceptoId: deSistema.id })).cuerpo.error.codigo).toBe(
      'concepto_de_sistema_no_se_elige',
    );
    expect(avisos).toEqual([]);
  });

  it('sin Cuentas por pagar activo no se desmarca (nadie revisa si está ligada)', async () => {
    const id = (await sinModulo.propietario.post('/api/bancos/notas', datos(cuentaSinModulo))).cuerpo.id;
    await comoMarcadaSinModulo(id);

    const respuesta = await sinModulo.propietario.post(`/api/bancos/notas/${id}/desmarcar`, {
      motivo: 'Sin módulo',
      conceptoId: (await sinModulo.propietario.get('/api/bancos/conceptos')).cuerpo.find(
        (c: { claveDeSistema: string | null }) => c.claveDeSistema === null,
      ).id,
    });

    expect(respuesta.cuerpo.error.codigo).toBe('modulo_de_origen_inactivo');
  });
});

describe('otras acciones sobre una nota marcada', () => {
  it('eliminar o corregir la nota marcada avisa antes; reclasificar con reparto no se permite', async () => {
    const sinReparto = await nota();
    const conReparto = await nota({ monto: '100.00' });
    for (const id of [sinReparto, conReparto]) await marcar(id);
    await repartir(conReparto, [{ claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 10000 }]);
    avisos = [];

    const reclasificarConReparto = await cuenta.propietario.post('/api/bancos/notas/reclasificar', {
      movimientoIds: [conReparto],
      conceptoId,
    });
    const reclasificarSinReparto = await cuenta.propietario.post('/api/bancos/notas/reclasificar', {
      movimientoIds: [sinReparto],
      conceptoId,
    });
    const eliminar = await cuenta.propietario.delete(`/api/bancos/notas/${conReparto}`, { motivo: 'Error' });

    expect(reclasificarConReparto.cuerpo.error.codigo).toBe('nota_marcada_con_desglose');
    expect(reclasificarSinReparto.estado).toBe(200);
    expect(eliminar.estado).toBe(204);
    expect(avisos).toEqual(['reclasificar', 'eliminar']);
    expect(await desgloseDe(conReparto)).toEqual([]);
  });

  it('corregir una nota marcada conserva la marca aunque el formulario traiga otro concepto', async () => {
    const id = await nota();
    await marcar(id);

    const corregida = await cuenta.propietario.put(
      `/api/bancos/notas/${id}`,
      datos(cuentaBancariaId, { referencia: 'Seguro' }),
    );

    expect(corregida.cuerpo).toMatchObject({ marcadaParaModulo: 'cuentas-por-pagar', referencia: 'Seguro' });
    expect(avisos).toEqual(['corregir']);
  });

  it('el reparto de una nota marcada toda en Inversión la deja marcada, con su concepto de siempre', async () => {
    const id = await nota({ monto: '100.00' });
    await marcar(id);

    const respuesta = await repartir(id, [{ claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 10000 }]);

    expect(respuesta).toEqual({ conDesglose: true });
    expect(await movimientoDe(cuenta.propietario, id)).toMatchObject({
      marcadaParaModulo: 'cuentas-por-pagar',
      conceptoNombre: 'Pago a proveedores',
      desglose: [expect.objectContaining({ concepto: 'Pago a proveedores de activo fijo', monto: '100.00' })],
    });
  });
});

/** Deja marcada una nota en la cuenta sin el módulo (por SQL: sin él no se puede marcar por la API). */
async function comoMarcadaSinModulo(movimientoId: string): Promise<void> {
  await comoPropietario(
    `update bancos.movimientos set concepto_id = (
       select c.id from bancos.conceptos c
        where c.empresa_id = bancos.movimientos.empresa_id and c.clave_de_sistema = 'pago_a_proveedor')
     where id = $1`,
    [movimientoId],
  );
}
