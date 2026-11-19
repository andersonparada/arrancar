/**
 * Liquidar y reabrir anticipos (CL-4): viático con dos facturas y un gasto sin documento, devolución, reembolso con cheque,
 * lo no liquidado (cuotas y renta del trabajo), el reparto por concepto en Bancos, los documentos del libro procesados, la
 * auditoría, los eventos, reabrir (aquí y desde Bancos) y los permisos de cada ruta.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-liquidar.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { anticipoEnBase, movimientoDelAnticipo, RUTA_DE_ANTICIPOS } from './soporte/cuentas-por-liquidar-anticipos.js';
import { EscenarioDeGastos } from './soporte/cuentas-por-liquidar-gastos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY } from './soporte/escenario-de-documentos.js';
import { auditoriaDe, desgloseDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeGastos;

beforeAll(async () => {
  e = await EscenarioDeGastos.preparar(entorno, 'cxlliquidar');
});

/** Letras al azar: un tercero con un nombre parecido a otro pide confirmación. */
const letras = () =>
  Array.from({ length: 10 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');

/** Un anticipo nuevo de `monto` (con cheque, a un empleado salvo que se diga otra cosa). */
async function anticipoDe(monto: string, cambios: Record<string, unknown> = {}): Promise<string> {
  const beneficiario = await e.anticipos.tercero(letras(), letras());
  return (await e.anticipos.entregar(e.anticipos.conCheque(beneficiario, monto, cambios))).id;
}

/** Un documento del libro (Q1,120.00) asignado al anticipo con su referencia; devuelve el id del documento. */
async function facturar(anticipoId: string): Promise<string> {
  const respuesta = await e.registrar({ referenciaDeDestino: anticipoId });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id;
}

const sinDocumento = (anticipoId: string, monto: string) =>
  e.propietario().post(`${RUTA_DE_ANTICIPOS}/${anticipoId}/gastos/sin-documento`, {
    monto,
    descripcion: 'Taxi',
    pagadoA: 'Taxista',
    conceptoDeGastoId: e.anticipos.conceptoDeGastoId,
    motivoSinDocumento: 'No dan factura',
  });

const liquidar = (anticipoId: string, cuerpo: Record<string, unknown> = {}, cliente = e.propietario()) =>
  cliente.post(`${RUTA_DE_ANTICIPOS}/${anticipoId}/liquidar`, { devuelto: '0.00', noLiquidado: '0.00', ...cuerpo });

const reabrir = (anticipoId: string, cuerpo: Record<string, unknown> = { motivo: 'Faltaba una factura' }) =>
  e.propietario().post(`${RUTA_DE_ANTICIPOS}/${anticipoId}/reabrir`, cuerpo);

const procesado = async (documentoId: string): Promise<boolean> =>
  (
    await consultar<{ procesado: boolean }>(
      'select procesado_en_destino_en is not null as procesado from libro_de_compras.documentos where id = $1',
      [documentoId],
    )
  )[0]!.procesado;

describe('devolver lo que sobró', () => {
  it('viático con dos facturas y un gasto sin documento: deposita lo devuelto, reparte la entrega y marca los documentos', async () => {
    const anticipoId = await anticipoDe('3000.00');
    const documentos = [await facturar(anticipoId), await facturar(anticipoId)];
    expect((await sinDocumento(anticipoId, '45.50')).estado).toBe(201);
    const eventos: Array<{ devueltoCentavos: number; gastadoCentavos: number }> = [];
    const baja = busEventos.suscribir('cuentas-por-liquidar.anticipo_liquidado', (datos) => {
      eventos.push(datos);
    });

    const respuesta = await liquidar(anticipoId, { devuelto: '714.50', referencia: 'BOL-77' });
    baja();

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'liquidado',
      gastado: '2285.50',
      porJustificar: '0.00',
      liquidacion: { devuelto: '714.50', reembolsado: '0.00', noLiquidado: '0.00', fecha: HOY },
      puedeReabrir: true,
      puedeLiquidar: false,
    });
    const anticipo = (await e.anticipos.propietario().get(`${RUTA_DE_ANTICIPOS}/${anticipoId}`)).cuerpo;
    expect(await desgloseDe(anticipo.movimiento.id)).toEqual([
      { clave: 'anticipo_por_liquidar', monto: '714.50' },
      { clave: 'gasto_de_anticipo', monto: '2285.50' },
    ]);
    const deposito = respuesta.cuerpo.liquidacion.movimientoDeDevolucionId as string;
    expect((await movimientoDelAnticipo(deposito)).clave).toBe('devolucion_de_anticipo');
    expect(await Promise.all(documentos.map(procesado))).toEqual([true, true]);
    expect(await auditoriaDe(anticipoId)).toEqual([]);
    expect(eventos).toMatchObject([{ devueltoCentavos: 71_450, gastadoCentavos: 228_550 }]);
  });

  it('lo que no cuadra con lo que falta por justificar se rechaza y el anticipo sigue abierto', async () => {
    const anticipoId = await anticipoDe('500.00');
    await sinDocumento(anticipoId, '100.00');

    const respuesta = await liquidar(anticipoId, { devuelto: '50.00' });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('liquidacion_no_cuadra');
    expect((await anticipoEnBase(anticipoId)).estado).toBe('abierto');
  });

  it('uno ya liquidado no se liquida otra vez y la fecha no puede ser futura', async () => {
    const anticipoId = await anticipoDe('100.00');
    const futura = await liquidar(anticipoId, { devuelto: '100.00', fecha: '2999-01-01' });
    await liquidar(anticipoId, { devuelto: '100.00' });

    const otra = await liquidar(anticipoId, { devuelto: '100.00' });

    expect(futura.cuerpo.error.codigo).toBe('fecha_de_liquidacion_invalida');
    expect(otra.cuerpo.error.codigo).toBe('anticipo_liquidado');
  });
});

describe('gastar de más', () => {
  it('reembolsa con un cheque a nombre del beneficiario, con el reparto de lo gastado de más', async () => {
    const anticipoId = await anticipoDe('1000.00');
    await facturar(anticipoId);

    const respuesta = await liquidar(anticipoId, {
      reembolso: { forma: 'cheque', chequeraId: e.anticipos.chequeraId },
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.liquidacion).toMatchObject({ reembolsado: '120.00', devuelto: '0.00' });
    const reembolso = respuesta.cuerpo.liquidacion.movimientoDeReembolsoId as string;
    expect((await movimientoDelAnticipo(reembolso)).clave).toBe('gasto_de_anticipo');
    expect((await movimientoDelAnticipo(respuesta.cuerpo.movimiento.id)).clave).toBe('gasto_de_anticipo');
  });

  it('sin decir cómo reembolsar se rechaza', async () => {
    const anticipoId = await anticipoDe('1000.00');
    await facturar(anticipoId);

    const respuesta = await liquidar(anticipoId);

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('reembolso_sin_medio_de_pago');
    expect((await anticipoEnBase(anticipoId)).estado).toBe('abierto');
  });
});

describe('lo no liquidado', () => {
  const sinLiquidar = (cambios: Record<string, unknown>) => ({
    devuelto: '100.00',
    noLiquidado: '600.00',
    motivoDeNoLiquidado: 'No entregó facturas',
    ...cambios,
  });

  it('cobrar pide 5 cuotas o más; con ellas queda con su destino, audita «ajustar» y reparte el desglose', async () => {
    const anticipoId = await anticipoDe('1000.00');
    await sinDocumento(anticipoId, '300.00');

    const pocas = await liquidar(anticipoId, sinLiquidar({ destinoDeNoLiquidado: 'cobrar', cuotas: 4 }));
    const bien = await liquidar(anticipoId, sinLiquidar({ destinoDeNoLiquidado: 'cobrar', cuotas: 5 }));

    expect(pocas.cuerpo.error.codigo).toBe('cuotas_insuficientes');
    expect(bien.estado, JSON.stringify(bien.cuerpo)).toBe(200);
    expect(bien.cuerpo.liquidacion).toMatchObject({ noLiquidado: '600.00', destinoDeNoLiquidado: 'cobrar', cuotas: 5 });
    expect(await auditoriaDe(anticipoId)).toEqual([
      { accion: 'ajustar', motivo: 'No entregó facturas', recurso: 'cuentas-por-liquidar.anticipos' },
    ]);
    expect(await desgloseDe(bien.cuerpo.movimiento.id)).toEqual([
      { clave: 'anticipo_por_liquidar', monto: '100.00' },
      { clave: 'gasto_de_anticipo', monto: '300.00' },
      { clave: 'anticipo_no_liquidado', monto: '600.00' },
    ]);
  });

  it('con pago voluntario cabe una sola cuota', async () => {
    const anticipoId = await anticipoDe('1000.00');
    await sinDocumento(anticipoId, '300.00');

    const respuesta = await liquidar(
      anticipoId,
      sinLiquidar({ destinoDeNoLiquidado: 'cobrar', cuotas: 1, pagoVoluntario: true }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  });

  it('la renta del trabajo solo se acepta de un empleado', async () => {
    const empleado = await anticipoDe('1000.00');
    const otro = await anticipoDe('1000.00', { esEmpleado: false });
    for (const id of [empleado, otro]) await sinDocumento(id, '300.00');

    const deEmpleado = await liquidar(empleado, sinLiquidar({ destinoDeNoLiquidado: 'renta_del_trabajo' }));
    const deOtro = await liquidar(otro, sinLiquidar({ destinoDeNoLiquidado: 'renta_del_trabajo' }));

    expect(deEmpleado.estado, JSON.stringify(deEmpleado.cuerpo)).toBe(200);
    expect(deOtro.cuerpo.error.codigo).toBe('renta_del_trabajo_solo_empleados');
    expect((await anticipoEnBase(otro)).estado).toBe('abierto');
  });

  it('sin destino o sin motivo se rechaza', async () => {
    const anticipoId = await anticipoDe('1000.00');
    await sinDocumento(anticipoId, '300.00');

    const sinDestino = await liquidar(anticipoId, sinLiquidar({}));
    const sinMotivo = await liquidar(
      anticipoId,
      sinLiquidar({ destinoDeNoLiquidado: 'perdida', motivoDeNoLiquidado: '' }),
    );

    expect(sinDestino.cuerpo.error.codigo).toBe('destino_de_no_liquidado_obligatorio');
    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_de_no_liquidado_obligatorio');
  });
});

describe('reabrir', () => {
  async function liquidado() {
    const anticipoId = await anticipoDe('1000.00');
    const documentoId = await facturar(anticipoId);
    const respuesta = await liquidar(anticipoId, {
      reembolso: { forma: 'cheque', chequeraId: e.anticipos.chequeraId },
    });
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    return { anticipoId, documentoId, movimientoId: respuesta.cuerpo.movimiento.id as string };
  }

  it('anula el reembolso, deja el anticipo abierto con su reparto original y devuelve el documento a pendiente', async () => {
    const { anticipoId, documentoId, movimientoId } = await liquidado();
    const eventos: string[] = [];
    const baja = busEventos.suscribir('cuentas-por-liquidar.anticipo_reabierto', (datos) => {
      eventos.push(datos.anulacionEnBancos ?? 'ninguno');
    });

    const respuesta = await reabrir(anticipoId);
    baja();

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ estado: 'abierto', liquidacion: null, puedeLiquidar: true });
    expect((await movimientoDelAnticipo(movimientoId)).clave).toBe('anticipo_por_liquidar');
    expect(await procesado(documentoId)).toBe(false);
    expect(await auditoriaDe(anticipoId)).toEqual([
      { accion: 'reabrir', motivo: 'Faltaba una factura', recurso: 'cuentas-por-liquidar.anticipos' },
    ]);
    expect(eventos).toHaveLength(1);
  });

  it('pide el motivo y uno abierto no se reabre', async () => {
    const { anticipoId } = await liquidado();

    const sinMotivo = await reabrir(anticipoId, { motivo: '  ' });
    await reabrir(anticipoId);
    const abierto = await reabrir(anticipoId);

    expect(sinMotivo.estado).toBe(400);
    expect(abierto.cuerpo.error.codigo).toBe('anticipo_no_liquidado');
  });

  it('si anulan la devolución desde Bancos, el anticipo se reabre', async () => {
    const anticipoId = await anticipoDe('300.00');
    const respuesta = await liquidar(anticipoId, { devuelto: '300.00' });
    const deposito = respuesta.cuerpo.liquidacion.movimientoDeDevolucionId as string;

    const anulada = await e
      .propietario()
      .post(`/api/bancos/notas/${deposito}/anular`, { motivo: 'Boleta de otro banco' });

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect((await anticipoEnBase(anticipoId)).estado).toBe('abierto');
    expect(await auditoriaDe(anticipoId)).toEqual([
      { accion: 'reabrir', motivo: 'Boleta de otro banco', recurso: 'cuentas-por-liquidar.anticipos' },
    ]);
  });

  it('Bancos no corrige ni elimina la devolución de un anticipo', async () => {
    const anticipoId = await anticipoDe('300.00');
    const respuesta = await liquidar(anticipoId, { devuelto: '300.00' });
    const deposito = respuesta.cuerpo.liquidacion.movimientoDeDevolucionId as string;

    const eliminar = await e.propietario().delete(`/api/bancos/notas/${deposito}`, { motivo: 'Corrección' });

    expect(eliminar.estado, JSON.stringify(eliminar.cuerpo)).toBe(422);
    expect((await anticipoEnBase(anticipoId)).estado).toBe('liquidado');
  });
});

describe('permisos', () => {
  it('liquidar y reabrir piden anticipos.liquidar; otra empresa o un id que no existe es 404', async () => {
    const anticipoId = await anticipoDe('100.00');

    const sinPermiso = await liquidar(anticipoId, { devuelto: '100.00' }, e.usuarios.asignador);
    const sinReabrir = await e.usuarios.asignador.post(`${RUTA_DE_ANTICIPOS}/${anticipoId}/reabrir`, { motivo: 'x' });
    const noExiste = await liquidar(crypto.randomUUID());

    expect([sinPermiso.estado, sinReabrir.estado, noExiste.estado]).toEqual([403, 403, 404]);
    expect((await anticipoEnBase(anticipoId)).estado).toBe('abierto');
  });

  it('un cuerpo con dinero mal escrito es 400', async () => {
    const anticipoId = await anticipoDe('100.00');

    expect((await liquidar(anticipoId, { devuelto: 'abc' })).estado).toBe(400);
  });
});
