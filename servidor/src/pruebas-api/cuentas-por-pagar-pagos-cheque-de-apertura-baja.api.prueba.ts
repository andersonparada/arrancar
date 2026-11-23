/**
 * Dar de baja el pago con cheque de apertura (AP-3, diseño CP-AP §2.3 y §2.4): desligarlo sin anular el cheque y volver a
 * ligarlo, anularlo (la factura queda pendiente y no pasa por la bandeja), el aviso de Bancos al anular el cheque y el lote de
 * caducos, el saldo al corte, y la referencia informativa de la cuenta de apertura a un cheque en circulación.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { agregarPartida, partida } from './soporte/apertura-por-api.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  fichaDelCargo,
  INICIO,
  ligarCheque,
  movimientoEnBase,
  posfechado,
  saldoEnContrasena,
} from './soporte/cuentas-por-pagar-cheques-de-apertura.js';
import {
  anularPago,
  chequeDelPago,
  inversoDe,
  MES_CONCILIADO,
  moverFechaDelPago,
  pagoEnBase,
} from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos, RUTA_DE_PAGOS } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let sinPermiso: ClienteApi;
const anulados: Array<Record<string, any>> = [];
let numeroDeCheque = 7000;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpchequeaperturabaja');
  const fijada = await e
    .propietario()
    .put(`/api/empresas/${e.mundo.escenario.cuenta.empresaId}/carga-inicial`, { fechaDeInicio: INICIO });
  expect(fijada.estado, JSON.stringify(fijada.cuerpo)).toBe(200);
  busEventos.suscribir('cuentas-por-pagar.pago_anulado', async (datos) => {
    anulados.push(datos as unknown as Record<string, any>);
  });
  sinPermiso = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Solo anula',
    apellidos: 'Cheque de apertura',
    permisos: ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.anular'],
  });
});

afterAll(() => {
  anulados.length = 0;
});

/** Un proveedor con un saldo inicial de Q700.00 y un pago de Q600.00 con un posfechado de la fecha dada. */
async function pagoConCheque(fecha = haceDias(-10)) {
  const proveedor = await e.mundo.unProveedor();
  const cargoId = await saldoEnContrasena(e, proveedor);
  const { movimientoId } = await posfechado(e, { monto: '600.00', fecha, beneficiario: 'Proveedor Uno' });
  const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId, monto: '600.00' });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return { proveedor, cargoId, movimientoId, pago: respuesta.cuerpo };
}

const desligar = (pagoId: string, cuerpo: Record<string, unknown> = { motivo: 'Se ligó a la factura equivocada' }) =>
  e.propietario().post(`${RUTA_DE_PAGOS}/${pagoId}/desligar`, cuerpo);

describe('desligar sin anular el cheque', () => {
  it('anula el pago con su propia fecha, deja el cheque vigente y sin clasificar, y la factura vuelve a deber', async () => {
    const { cargoId, movimientoId, pago } = await pagoConCheque();

    const respuesta = await desligar(pago.id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'anulado',
      anulacion: { fecha: haceDias(-10), motivo: 'Se ligó a la factura equivocada' },
    });
    expect(await pagoEnBase(pago.id)).toMatchObject({
      estado: 'anulado',
      fecha_de_anulacion: haceDias(-10),
      vigentes: '0',
    });
    expect(await movimientoEnBase(movimientoId)).toMatchObject({
      modulo_de_origen: null,
      documento_de_origen_id: null,
      concepto: 'sin_clasificar',
      anulado_en: null,
    });
    expect(await fichaDelCargo(e, cargoId)).toMatchObject({
      saldo: '700.00',
      comprometido: '0.00',
      estadoDePago: 'pendiente',
    });
  });

  it('audita anular en el pago con el motivo y publica pago_anulado sin movimiento propio en Bancos', async () => {
    const { pago } = await pagoConCheque();

    await desligar(pago.id, { motivo: 'Factura equivocada' });

    expect(await auditoriaDe(pago.id)).toEqual([
      { accion: 'anular', recurso: 'cuentas-por-pagar.pagos', motivo: 'Factura equivocada' },
    ]);
    expect(anulados.find(({ pagoId }) => pagoId === pago.id)).toMatchObject({
      anulacionEnBancos: null,
      fecha: haceDias(-10),
      efecto: 'banco',
    });
  });

  it('el mismo cheque se liga después a las facturas correctas', async () => {
    const { proveedor, movimientoId, pago } = await pagoConCheque();
    const correcta = await saldoEnContrasena(e, proveedor);
    expect((await desligar(pago.id)).estado).toBe(200);

    const religado = await ligarCheque(e, { proveedor, movimientoId, cargoId: correcta, monto: '600.00' });

    expect(religado.estado, JSON.stringify(religado.cuerpo)).toBe(201);
    expect((await movimientoEnBase(movimientoId)).documento_de_origen_id).toBe(religado.cuerpo.id);
    expect(await fichaDelCargo(e, correcta)).toMatchObject({ comprometido: '600.00' });
  });

  it('pide el motivo, solo desliga un pago vigente con cheque de apertura y exige su permiso', async () => {
    const { pago } = await pagoConCheque();
    const conCheque = await e.proveedorConCargo();
    const normal = await e.pagar(
      e.cheque(conCheque.proveedor.proveedorId, [{ cargoId: conCheque.cargo, monto: '100.00' }]),
    );
    expect(normal.estado, JSON.stringify(normal.cuerpo)).toBe(201);

    const sinMotivo = await desligar(pago.id, { motivo: ' ' });
    const sinElPermiso = await sinPermiso.post(`${RUTA_DE_PAGOS}/${pago.id}/desligar`, { motivo: 'Prueba' });
    const deOtraForma = await desligar(normal.cuerpo.id);
    expect((await desligar(pago.id)).estado).toBe(200);
    const yaAnulado = await desligar(pago.id);

    expect(sinMotivo.estado).toBe(400);
    expect(sinElPermiso.estado).toBe(403);
    expect(deOtraForma.estado, JSON.stringify(deOtraForma.cuerpo)).toBe(422);
    expect(deOtraForma.cuerpo.error.codigo).toBe('pago_no_es_cheque_de_apertura');
    expect(yaAnulado.estado, JSON.stringify(yaAnulado.cuerpo)).toBe(422);
    expect(yaAnulado.cuerpo.error.codigo).toBe('pago_ya_anulado');
  });

  it('la ficha del pago ofrece desligar solo mientras está vigente', async () => {
    const { pago } = await pagoConCheque();
    const ficha = async () => (await e.propietario().get(`${RUTA_DE_PAGOS}/${pago.id}`)).cuerpo;

    expect(await ficha()).toMatchObject({ forma: 'cheque_de_apertura', puedeDesligar: true });
    await desligar(pago.id);

    expect(await ficha()).toMatchObject({ puedeDesligar: false });
  });
});

describe('anular el pago', () => {
  it('anula el cheque en Bancos, la factura vuelve a deber y no hay inverso ni partida anulada', async () => {
    const { cargoId, movimientoId, pago } = await pagoConCheque();

    const respuesta = await anularPago(e.propietario(), pago.id, { motivo: 'Se perdió' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.estado).toBe('anulado');
    expect((await movimientoEnBase(movimientoId)).anulado_en).not.toBeNull();
    expect(await inversoDe(movimientoId)).toBeUndefined();
    expect(await fichaDelCargo(e, cargoId)).toMatchObject({ saldo: '700.00', estadoDePago: 'pendiente' });
    const bandeja = await consultar<{ n: string }>(
      `select count(*)::text as n from bancos.movimientos m join bancos.conceptos c on c.id = m.concepto_id
        where c.clave_de_sistema = 'anulacion_de_apertura' and m.revierte_a_id = $1`,
      [movimientoId],
    );
    expect(bandeja[0]!.n).toBe('0');
  });

  it('anular el cheque desde Bancos anula el pago y deja la factura pendiente', async () => {
    const { cargoId, movimientoId, pago } = await pagoConCheque();
    const chequeId = await chequeDelPago(pago.id);

    const anulado = await e.propietario().post(`/api/bancos/cheques/${chequeId}/anular`, { motivo: 'Se perdió' });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect((await pagoEnBase(pago.id)).estado).toBe('anulado');
    expect((await movimientoEnBase(movimientoId)).anulado_en).not.toBeNull();
    expect(await fichaDelCargo(e, cargoId)).toMatchObject({ saldo: '700.00', estadoDePago: 'pendiente' });
  });

  it('la anulación en lote de cheques caducos anula el pago con la fecha del inverso', async () => {
    const { pago } = await pagoConCheque();
    await moverFechaDelPago(pago.id, MES_CONCILIADO);

    const lote = await e.propietario().post('/api/bancos/cheques/anular-en-lote', {
      chequeIds: [await chequeDelPago(pago.id)],
      motivo: 'Cheques caducos',
      fecha: HOY,
    });

    expect(lote.estado, JSON.stringify(lote.cuerpo)).toBe(200);
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY });
  });
});

describe('el saldo al corte', () => {
  const documentosAl = async (corte: string, cargoId: string) => {
    const { numero } = await fichaDelCargo(e, cargoId);
    const respuesta = await e.propietario().get(`/api/cuentas-por-pagar/reportes/documentos?corte=${corte}&limite=500`);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    return respuesta.cuerpo.filas.find((fila: { numero: string }) => fila.numero === numero);
  };

  it('el pago cuenta desde su fecha: a un corte anterior la factura sigue debiéndose, a hoy está pagada', async () => {
    const { cargoId } = await pagoConCheque(haceDias(5));

    expect(await documentosAl(haceDias(10), cargoId)).toMatchObject({ saldo: '700.00', pagado: '0.00' });
    expect(await documentosAl(HOY, cargoId)).toMatchObject({ saldo: '100.00', pagado: '600.00' });
  });
});

describe('la referencia de la cuenta de apertura a un cheque en circulación', () => {
  /** Un saldo con movimientos (un cheque de Q100.00): sin ellos, con la carga abierta, no se da por pagado. */
  async function saldoConMovimientos() {
    const proveedor = await e.mundo.unProveedor();
    const cargoId = await saldoEnContrasena(e, proveedor);
    const cheque = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId, monto: '100.00' }]));
    expect(cheque.estado, JSON.stringify(cheque.cuerpo)).toBe(201);
    return { proveedor, cargoId };
  }

  const aperturaCon = (datos: { proveedorId: string; cargoId: string }, referido?: string) =>
    e.propietario().post(`${RUTA_DE_PAGOS}/apertura`, {
      forma: 'cuenta_de_apertura',
      proveedorId: datos.proveedorId,
      motivo: 'Ya se pagó con el cheque de la carga inicial',
      aplicaciones: [{ cargoId: datos.cargoId, monto: '600.00' }],
      ...(referido ? { chequeDeAperturaReferidoId: referido } : {}),
    });

  async function chequeEnCirculacion(): Promise<string> {
    const cuentaId = await crearCuentaSinSaldo(e.propietario());
    const agregada = await agregarPartida(
      e.propietario(),
      cuentaId,
      partida('cheque_en_circulacion', { numeroDeCheque: ++numeroDeCheque }),
    );
    expect(agregada.estado, JSON.stringify(agregada.cuerpo)).toBe(201);
    return agregada.cuerpo.partida.movimientoId as string;
  }

  it('se guarda sin cambiar el saldo ni la forma del pago, y se ve en el pago', async () => {
    const { proveedor, cargoId } = await saldoConMovimientos();
    const referido = await chequeEnCirculacion();

    const respuesta = await aperturaCon({ proveedorId: proveedor.proveedorId, cargoId }, referido);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ forma: 'cuenta_de_apertura', chequeDeAperturaReferidoId: referido });
    expect((await fichaDelCargo(e, cargoId)).saldo).toBe('0.00');
    const [fila] = await consultar<{ referido: string }>(
      'select cheque_de_apertura_referido_id::text as referido from cuentas_por_pagar.pagos where id = $1',
      [respuesta.cuerpo.id],
    );
    expect(fila!.referido).toBe(referido);
  });

  it('sin referencia queda en blanco, y un movimiento que no es un cheque en circulación se rechaza', async () => {
    const { proveedor, cargoId } = await saldoConMovimientos();
    const posfechadoSinLigar = (await posfechado(e, { monto: '50.00', fecha: haceDias(-3), beneficiario: 'X' }))
      .movimientoId;

    const delPosfechado = await aperturaCon({ proveedorId: proveedor.proveedorId, cargoId }, posfechadoSinLigar);
    const inexistente = await aperturaCon({ proveedorId: proveedor.proveedorId, cargoId }, crypto.randomUUID());
    const sin = await aperturaCon({ proveedorId: proveedor.proveedorId, cargoId });

    for (const rechazada of [delPosfechado, inexistente]) {
      expect(rechazada.estado, JSON.stringify(rechazada.cuerpo)).toBe(400);
      expect(rechazada.cuerpo.error.codigo).toBe('cheque_de_apertura_referido_invalido');
    }
    expect(sin.estado, JSON.stringify(sin.cuerpo)).toBe(201);
    expect(sin.cuerpo.chequeDeAperturaReferidoId).toBeNull();
  });
});
