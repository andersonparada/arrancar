/**
 * Aplicar saldos iniciales a la cuenta de apertura (CP4-6): con la carga abierta solo un saldo que ya tuvo movimientos, con
 * la fecha de inicio aunque se mande otra y efecto `apertura`; con la carga cerrada, una corrección de error con la fecha
 * elegida. Sin movimiento en Bancos, con motivo obligatorio, auditoría `ajustar`, sin contar para la bancarización y con la
 * fecha contable de la anulación en el día de hoy.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import type { ProveedorDePrueba } from './soporte/cuentas-por-pagar-contrasenas.js';
import { anularPago, pagoEnBase } from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos, RUTA_DE_PAGOS } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
const INICIO = haceDias(30);
let e: EscenarioDePagos;
let sinPermiso: ClienteApi;
const eventos: Array<Record<string, any>> = [];

const rutaCarga = () => `/api/empresas/${e.mundo.escenario.cuenta.empresaId}/carga-inicial`;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosapertura');
  const fijada = await e.propietario().put(rutaCarga(), { fechaDeInicio: INICIO });
  expect(fijada.estado, JSON.stringify(fijada.cuerpo)).toBe(200);
  busEventos.suscribir('cuentas-por-pagar.pago_registrado', async (datos) => {
    eventos.push(datos as unknown as Record<string, any>);
  });
  sinPermiso = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Solo emite',
    apellidos: 'Apertura',
    permisos: ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.emitir'],
  });
});

afterAll(() => {
  eventos.length = 0;
});

let secuencia = 0;

/** Un saldo inicial autorizado y dentro de una contraseña (Q700.00 por pagar al corte). */
async function saldoEnContrasena(proveedor: ProveedorDePrueba): Promise<string> {
  const creado = await e.propietario().post('/api/cuentas-por-pagar/saldos-iniciales', {
    proveedorId: proveedor.proveedorId,
    tipo: 'factura',
    serie: 'A',
    numero: `AP-${++secuencia}-${Math.random().toString(36).slice(2, 7)}`,
    fechaEmision: haceDias(90),
    vencimiento: haceDias(50),
    total: '1120.00',
    retenciones: '120.00',
    retencionesPorPracticar: '0.00',
    saldoPendiente: '700.00',
    referencia: 'CXP-0045',
    tieneActivoFijo: false,
  });
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  const id = creado.cuerpo.id as string;
  await e.autorizar(id, { yaCompletado: true });
  await e.contrasena(proveedor, [id]);
  return id;
}

const apertura = (proveedor: ProveedorDePrueba, cargoId: string, cambios: Record<string, unknown> = {}) =>
  e.propietario().post(`${RUTA_DE_PAGOS}/apertura`, {
    forma: 'cuenta_de_apertura',
    proveedorId: proveedor.proveedorId,
    motivo: 'Ya se había pagado con el sistema anterior',
    referencia: 'Cheque 123 del sistema anterior',
    aplicaciones: [{ cargoId, monto: '600.00' }],
    ...cambios,
  });

const pagoEnTabla = async (pagoId: string) =>
  (
    await consultar<{ forma: string; movimiento_id: string | null; motivo: string; con_carga_cerrada: boolean }>(
      'select forma, movimiento_id, motivo, con_carga_cerrada from cuentas_por_pagar.pagos where id = $1',
      [pagoId],
    )
  )[0]!;

const movimientosDeBancos = async () =>
  (await consultar<{ n: string }>('select count(*)::text as n from bancos.movimientos'))[0]!.n;

/** Un pago con cheque de Q100.00 al saldo: con él ya tiene movimientos. */
async function conMovimientos(proveedor: ProveedorDePrueba, cargoId: string): Promise<void> {
  const cheque = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId, monto: '100.00' }]));
  expect(cheque.estado, JSON.stringify(cheque.cuerpo)).toBe(201);
}

describe('con la carga inicial abierta', () => {
  it('rechaza un saldo sin movimientos, también autorizado y en la contraseña, y no guarda nada', async () => {
    const proveedor = await e.mundo.unProveedor();
    const saldo = await saldoEnContrasena(proveedor);

    const respuesta = await apertura(proveedor, saldo);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('corrija_el_saldo_inicial');
    expect(respuesta.cuerpo.error.mensaje).toContain('quítelo de la contraseña, desautorícelo');
    expect((await e.propietario().get(`/api/cuentas-por-pagar/documentos/${saldo}`)).cuerpo.saldo).toBe('700.00');
  });

  it('con movimientos pasa: fecha de inicio aunque se mande otra, sin movimiento en Bancos, efecto apertura y avisos', async () => {
    const proveedor = await e.mundo.unProveedor();
    const saldo = await saldoEnContrasena(proveedor);
    await conMovimientos(proveedor, saldo);
    const antes = await movimientosDeBancos();

    const respuesta = await apertura(proveedor, saldo, { fecha: HOY });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      forma: 'cuenta_de_apertura',
      fecha: INICIO,
      monto: '600.00',
      movimiento: null,
      motivo: 'Ya se había pagado con el sistema anterior',
      conCargaCerrada: false,
      estado: 'vigente',
      posfechado: false,
    });
    expect(respuesta.cuerpo.aplicaciones[0]).toMatchObject({ retencionDescontada: '0.00', monto: '600.00' });
    expect(respuesta.cuerpo.avisos).toContain(
      'Use esta forma solo si el documento ya se había pagado antes de la fecha de inicio.',
    );
    expect(respuesta.cuerpo.avisos.some((a: string) => a.includes('contra la cuenta puente de apertura'))).toBe(true);
    expect(await pagoEnTabla(respuesta.cuerpo.id)).toMatchObject({ movimiento_id: null, con_carga_cerrada: false });
    expect(await movimientosDeBancos()).toBe(antes);
    expect((await e.propietario().get(`/api/cuentas-por-pagar/documentos/${saldo}`)).cuerpo.saldo).toBe('0.00');
    const evento = eventos.find(({ pagoId }) => pagoId === respuesta.cuerpo.id)!;
    expect(evento).toMatchObject({ efecto: 'apertura', fecha: INICIO, movimientoId: null, posfechado: false });
  });

  it('audita ajustar con el motivo y las fichas de los cargos antes del pago', async () => {
    const proveedor = await e.mundo.unProveedor();
    const saldo = await saldoEnContrasena(proveedor);
    await conMovimientos(proveedor, saldo);

    const respuesta = await apertura(proveedor, saldo, { motivo: 'Pagado en 2025' });

    const rastro = await auditoriaDe(respuesta.cuerpo.id);
    expect(rastro).toEqual([{ accion: 'ajustar', recurso: 'cuentas-por-pagar.pagos', motivo: 'Pagado en 2025' }]);
  });

  it('anularlo deja la fecha contable de la anulación en hoy, sin tocar Bancos, y el saldo vuelve', async () => {
    const proveedor = await e.mundo.unProveedor();
    const saldo = await saldoEnContrasena(proveedor);
    await conMovimientos(proveedor, saldo);
    const pago = (await apertura(proveedor, saldo)).cuerpo;
    const antes = await movimientosDeBancos();

    const anulado = await anularPago(e.propietario(), pago.id, { motivo: 'Se aplicó por error' });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(anulado.cuerpo.anulacion).toEqual({ fecha: HOY, motivo: 'Se aplicó por error' });
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY, vigentes: '0' });
    expect(await movimientosDeBancos()).toBe(antes);
    expect((await e.propietario().get(`/api/cuentas-por-pagar/documentos/${saldo}`)).cuerpo.saldo).toBe('600.00');
  });
});

describe('reglas de la forma', () => {
  it('pide el motivo, solo admite saldos iniciales y exige su permiso', async () => {
    const proveedor = await e.mundo.unProveedor();
    const saldo = await saldoEnContrasena(proveedor);
    await conMovimientos(proveedor, saldo);
    const delLibro = await e.proveedorConCargo();

    const sinMotivo = await apertura(proveedor, saldo, { motivo: '  ' });
    const sinAplicaciones = await apertura(proveedor, saldo, { aplicaciones: [] });
    const cargoDelLibro = await apertura(delLibro.proveedor, delLibro.cargo);
    const noPermitido = await sinPermiso.post(`${RUTA_DE_PAGOS}/apertura`, {
      forma: 'cuenta_de_apertura',
      proveedorId: proveedor.proveedorId,
      motivo: 'Pagado',
      aplicaciones: [{ cargoId: saldo, monto: '600.00' }],
    });

    expect(sinMotivo.estado).toBe(400);
    expect(sinAplicaciones.estado).toBe(400);
    expect(cargoDelLibro.estado, JSON.stringify(cargoDelLibro.cuerpo)).toBe(422);
    expect(cargoDelLibro.cuerpo.error.codigo).toBe('solo_saldos_iniciales');
    expect(noPermitido.estado).toBe(403);
    expect((await e.propietario().get(`/api/cuentas-por-pagar/documentos/${saldo}`)).cuerpo.saldo).toBe('600.00');
  });

  it('no pasa del saldo del documento', async () => {
    const proveedor = await e.mundo.unProveedor();
    const saldo = await saldoEnContrasena(proveedor);
    await conMovimientos(proveedor, saldo);

    const demasiado = await apertura(proveedor, saldo, { aplicaciones: [{ cargoId: saldo, monto: '700.00' }] });

    expect(demasiado.estado, JSON.stringify(demasiado.cuerpo)).toBe(400);
    expect(demasiado.cuerpo.error.codigo).toBe('pago_mayor_que_el_saldo');
  });
});

describe('con la carga inicial cerrada', () => {
  it('es una corrección de error: acepta un saldo sin movimientos, con la fecha elegida, y no cuenta para la bancarización', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [uno, dos, tres] = [
      await saldoEnContrasena(proveedor),
      await saldoEnContrasena(proveedor),
      await saldoEnContrasena(proveedor),
    ];
    const cierre = await e.propietario().post(`${rutaCarga()}/cerrar`, {});
    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
    const eligio = haceDias(10);

    const porOmision = await apertura(proveedor, uno);
    const elegida = await apertura(proveedor, dos, { fecha: eligio });
    const futura = await apertura(proveedor, tres, { fecha: haceDias(-1) });
    const anterior = await apertura(proveedor, tres, { fecha: haceDias(31) });
    const paraPagar = await e
      .propietario()
      .get(`/api/cuentas-por-pagar/proveedores/${proveedor.proveedorId}/para-pagar`);

    expect(porOmision.estado, JSON.stringify(porOmision.cuerpo)).toBe(201);
    expect(porOmision.cuerpo).toMatchObject({ fecha: HOY, conCargaCerrada: true });
    expect(porOmision.cuerpo.avisos.some((a: string) => a.includes('corrección de error de períodos anteriores'))).toBe(
      true,
    );
    expect(elegida.cuerpo.fecha).toBe(eligio);
    expect(await pagoEnTabla(porOmision.cuerpo.id)).toMatchObject({ con_carga_cerrada: true, movimiento_id: null });
    for (const rechazada of [futura, anterior]) {
      expect(rechazada.estado, JSON.stringify(rechazada.cuerpo)).toBe(400);
      expect(rechazada.cuerpo.error.codigo).toBe('fecha_de_pago_invalida');
    }
    expect(eventos.find(({ pagoId }) => pagoId === porOmision.cuerpo.id)).toMatchObject({
      efecto: 'correccion_de_error',
      fecha: HOY,
    });
    expect(paraPagar.cuerpo.sumaDelMesAlProveedor).toBe('0.00');
  });
});
