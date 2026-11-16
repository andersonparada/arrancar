/**
 * Anular un pago desde Cuentas por pagar (CP4-4): el cheque de un mes abierto se anula a la antigua (`sin_inverso`) y el de un
 * mes conciliado o una nota de débito con inverso, la fecha contable de la anulación (`fecha_de_anulacion`), el cheque
 * cobrado que se rechaza, la retención que pasa al siguiente pago, las diferencias de centavos que se anulan y los permisos.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  anularPago,
  cerrarEnero,
  cuentaConFondos,
  inversoDe,
  iniciarEnero,
  MES_CONCILIADO,
  moverFechaDelPago,
  pagoEnBase,
} from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { sembrarPago } from './soporte/cuentas-por-pagar-pagos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { auditoriaDe, movimientoDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let autoriza: ClienteApi;
let sinPermiso: ClienteApi;
const eventos: Array<{ nombre: string; datos: Record<string, any> }> = [];

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosanul');
  for (const nombre of ['pago_anulado', 'ajuste_anulado'] as const) {
    busEventos.suscribir(`cuentas-por-pagar.${nombre}`, async (datos) => {
      eventos.push({ nombre, datos: datos as unknown as Record<string, any> });
    });
  }
  const usuario = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, { nombres, apellidos: 'Anulaciones', permisos });
  autoriza = await usuario('Autoriza', ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar']);
  sinPermiso = await usuario('Solo emite', ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.emitir']);
});

afterAll(() => {
  eventos.length = 0;
});

const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;
const eventoDe = (pagoId: string) => eventos.find(({ datos }) => datos.pagoId === pagoId)!;

describe('anular un cheque de un mes abierto', () => {
  it('lo anula a la antigua: su fecha contable es la del pago, el saldo vuelve y Bancos lo deja anulado', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }]))).cuerpo;
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);

    const respuesta = await anularPago(e.propietario(), pago.id, { motivo: 'Se emitió por error' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'anulado',
      anulacion: { fecha: HOY, motivo: 'Se emitió por error' },
    });
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY, vigentes: '0' });
    expect(await ficha(cargo)).toMatchObject({ saldo: '1120.00', estadoDePago: 'pendiente' });
    expect((await movimientoDe(e.propietario(), pago.movimiento.id)).anuladoEn).toEqual(expect.any(String));
    expect(await inversoDe(pago.movimiento.id)).toBeUndefined();
    expect(Number(await saldoDe(e.propietario(), e.cuentaBancariaId))).toBe(Number(saldoAntes) + 1120);
    expect(await auditoriaDe(pago.id)).toEqual([
      { accion: 'anular', motivo: 'Se emitió por error', recurso: 'cuentas-por-pagar.pagos' },
    ]);
    expect(eventoDe(pago.id).datos).toMatchObject({
      anulacionEnBancos: 'sin_inverso',
      fechaOriginal: pago.fecha,
      fecha: pago.fecha,
      montoCentavos: 112000,
      efecto: 'banco',
    });
  });

  it('la retención descontada queda libre para el siguiente pago del cargo', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('5600.00');
    const retencion = (await ficha(cargo)).retenciones;
    const primero = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]))).cuerpo;
    expect(primero.aplicaciones[0].retencionDescontada).toBe(retencion);

    await anularPago(e.propietario(), primero.id);
    const segundo = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]));

    expect(segundo.cuerpo.aplicaciones[0].retencionDescontada).toBe(retencion);
  });

  it('un pago anulado no se anula otra vez, y sin permiso o sin motivo se rechaza', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }]))).cuerpo;

    expect((await anularPago(sinPermiso, pago.id)).estado).toBe(403);
    expect((await anularPago(e.propietario(), pago.id, { motivo: '  ' })).estado).toBe(400);
    expect((await anularPago(e.propietario(), pago.id)).estado).toBe(200);
    const repetida = await anularPago(e.propietario(), pago.id);
    expect(repetida.estado).toBe(422);
    expect(repetida.cuerpo.error.codigo).toBe('pago_ya_anulado');
    expect((await anularPago(e.propietario(), crypto.randomUUID())).estado).toBe(404);
  });

  it('anula también la diferencia de centavos que dejó el pago', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (
      await e.pagar(
        e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1119.97' }], {
          diferencias: [{ cargoId: cargo, monto: '0.03' }],
        }),
      )
    ).cuerpo;
    expect(await ficha(cargo)).toMatchObject({ saldo: '0.00' });

    await anularPago(e.propietario(), pago.id);

    expect(await ficha(cargo)).toMatchObject({ saldo: '1120.00' });
    const [ajuste] = await consultar<{ id: string; estado: string }>(
      'select id, estado from cuentas_por_pagar.ajustes_de_saldo where pago_id = $1',
      [pago.id],
    );
    expect(ajuste!.estado).toBe('anulado');
    expect((await auditoriaDe(ajuste!.id)).map(({ accion }) => accion)).toEqual(['ajustar', 'anular']);
    expect(eventos.some(({ nombre, datos }) => nombre === 'ajuste_anulado' && datos.ajusteId === ajuste!.id)).toBe(
      true,
    );
  });
});

describe('un cheque de un mes ya conciliado', () => {
  it('se anula con inverso: la fecha contable es la fecha del inverso que leyó de Bancos', async () => {
    const { cuentaBancariaId, chequeraId } = await cuentaConFondos(e.propietario(), 'Cuenta conciliada');
    const { proveedor, cargo } = await e.proveedorConCargo();
    const emitido = await e.pagar({
      ...e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '700.00' }]),
      chequeraId,
    });
    expect(emitido.estado, JSON.stringify(emitido.cuerpo)).toBe(201);
    const pago = emitido.cuerpo;
    await moverFechaDelPago(pago.id, MES_CONCILIADO);
    await cerrarEnero(e.propietario(), autoriza, await iniciarEnero(e.propietario(), cuentaBancariaId));

    const respuesta = await anularPago(e.propietario(), pago.id, { motivo: 'Caducó', fecha: HOY });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    const inverso = await inversoDe(pago.movimiento.id);
    expect(inverso?.fecha).toBe(HOY);
    expect(await pagoEnBase(pago.id)).toMatchObject({
      estado: 'anulado',
      fecha: MES_CONCILIADO,
      fecha_de_anulacion: HOY,
    });
    expect(eventoDe(pago.id).datos).toMatchObject({
      anulacionEnBancos: 'con_inverso',
      fecha: HOY,
      fechaOriginal: MES_CONCILIADO,
    });
  });
});

describe('una nota de débito', () => {
  it('se anula con inverso y el pago toma la fecha del inverso, aunque Bancos use la del original (misma_fecha)', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const emitido = await e.pagar(e.nota(proveedor.proveedorId, [{ cargoId: cargo, monto: '400.00' }]));
    expect(emitido.estado, JSON.stringify(emitido.cuerpo)).toBe(201);
    const pago = emitido.cuerpo;
    const antes = haceDias(10);
    await consultar('update bancos.movimientos set fecha = $2 where id = $1', [pago.movimiento.id, antes]);
    await consultar('update cuentas_por_pagar.pagos set fecha = $2 where id = $1', [pago.id, antes]);
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: e.mundo.escenario.cuenta.empresaId });
    const variable = '/api/configuracion/bancos.anulaciones.misma_fecha';
    await entorno.soporte.put(variable, { nivel: 'empresa', valor: true });

    const respuesta = await anularPago(e.propietario(), pago.id, { motivo: 'Duplicada', fecha: HOY });
    await entorno.soporte.delete(`${variable}?nivel=empresa`);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect((await inversoDe(pago.movimiento.id))?.fecha).toBe(antes);
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: antes });
  });
});

// Al final: el pago sembrado toma el siguiente número a mano y chocaría con el correlativo de los pagos que siguen.
describe('un pago sin movimiento en Bancos', () => {
  it('su fecha contable es la de hoy y Bancos no se toca', async () => {
    const proveedor = await e.mundo.unProveedor();
    const cargo = await e.cargoAutorizado(proveedor);
    const contrasenaId = await e.contrasena(proveedor, [cargo]);
    const sembrado = await sembrarPago(e.mundo.escenario, {
      contrasenaId,
      lineas: [{ cargoPropio: cargo, monto: '300.00' }],
    });
    const { id } = sembrado;

    const respuesta = await anularPago(e.propietario(), id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.movimiento).toBeNull();
    expect(await pagoEnBase(id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY });
    expect(eventoDe(id).datos).toMatchObject({ anulacionEnBancos: null, efecto: 'apertura', movimientoId: null });
  });
});
