/**
 * Devoluciones a proveedor (INV-5): salen al costo de su entrada (con PEPS, de su propia capa), no pasan de lo que queda
 * de la entrada ni de la existencia, publican su evento, bajan el pendiente de la nota en la bandeja y se anulan con su
 * auditoría y la guardia de la recepción.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../modulos/core/contratos/inventarios.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import { crearArticulo, kardexDe } from './soporte/escenario-de-kardex.js';
import { comprar, devolver, factura, nota, rebajar, sacar } from './soporte/escenario-de-notas.js';
import {
  porRecibir,
  prepararRecepciones,
  RUTA_DEVOLUCIONES,
  RUTA_RECEPCIONES,
  RUTA_REBAJAS,
  type EscenarioDeRecepciones,
} from './soporte/escenario-de-recepciones.js';

const entorno = usarEntornoApi();
let e: EscenarioDeRecepciones;
const eventos: Array<{
  documentoId: string;
  entradasDevueltas: string[];
  renglones: Array<{ costoCentavos: number }>;
}> = [];

const propietario = () => e.cuenta.propietario;
const nuevoArticulo = () => crearArticulo(propietario(), e.referencias);

beforeAll(async () => {
  instalarDestinoFalso();
  busEventos.suscribir('inventarios.devolucion_a_proveedor', (datos) => {
    eventos.push(datos);
  });
  e = await prepararRecepciones(entorno, 'recepcionesdevoluciones');
});

afterAll(async () => {
  vi.restoreAllMocks();
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('devoluciones a proveedor', () => {
  it('salen de la bodega de la entrada al costo de su entrada y no al promedio del artículo', async () => {
    const articulo = await nuevoArticulo();
    const primera = await comprar(e, articulo, { cantidad: '100', costo: 200 });
    await comprar(e, articulo, { cantidad: '100', costo: 230, dias: 9 });
    const { lineaIds } = await nota(e, primera.documentoId, 50);

    const respuesta = await devolver(e, { lineaId: lineaIds[0]!, entradaId: primera.entradaId, cantidad: '10' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      clase: 'devolucion_a_proveedor',
      bodegaId: e.bodegaId,
      documentoRelacionadoId: primera.recepcionId,
      costoTotal: '20.00',
    });
    const kardex = await kardexDe(propietario(), articulo);
    expect(kardex.renglones.at(-1)).toMatchObject({
      clase: 'devolucion_a_proveedor',
      salida: '10.0000',
      saldoValor: '410.00',
    });
    expect(eventos.find((ev) => ev.documentoId === respuesta.cuerpo.id)).toMatchObject({
      entradasDevueltas: [primera.entradaId],
      renglones: [{ costoCentavos: 2_000 }],
    });
  });

  it('no pasan de lo que queda de la entrada, no son de otra factura y la existencia no queda negativa', async () => {
    const articulo = await nuevoArticulo();
    const compra = await comprar(e, articulo, { cantidad: '100', costo: 200 });
    const otra = await comprar(e, articulo, { cantidad: '10', costo: 20, dias: 9 });
    const { lineaIds } = await nota(e, compra.documentoId, 100);
    const lineaId = lineaIds[0]!;
    await devolver(e, { lineaId, entradaId: compra.entradaId, cantidad: '70' });

    const demasiado = await devolver(e, { lineaId, entradaId: compra.entradaId, cantidad: '30.0001' });
    const deOtraFactura = await devolver(e, { lineaId, entradaId: otra.entradaId, cantidad: '1' });
    await sacar(e, articulo, { cantidad: '35', dias: 4 });
    const sinExistencia = await devolver(e, { lineaId, entradaId: compra.entradaId, cantidad: '10', dias: 3 });

    expect(demasiado.cuerpo.error.codigo).toBe('devolucion_mayor_que_la_entrada');
    expect(deOtraFactura.cuerpo.error.codigo).toBe('nota_no_corresponde_a_las_entradas');
    expect(sinExistencia.cuerpo.error.codigo).toBe('existencia_negativa');
  });

  it('con PEPS rebajan su propia capa: no cambian qué capa consume la siguiente salida', async () => {
    const peps = await prepararRecepciones(entorno, 'recepcionespeps');
    await peps.cuenta.propietario.post('/api/inventarios/metodo-de-costeo', { metodo: 'peps' });
    await comprar(peps, peps.articuloId, { cantidad: '100', costo: 200 });
    const segunda = await comprar(peps, peps.articuloId, { cantidad: '100', costo: 230, dias: 9 });
    const { lineaIds } = await nota(peps, segunda.documentoId, 50);

    const devolucion = await devolver(peps, { lineaId: lineaIds[0]!, entradaId: segunda.entradaId, cantidad: '10' });
    const consumo = await sacar(peps, peps.articuloId, { cantidad: '120', dias: 4 });

    expect(devolucion.cuerpo.costoTotal).toBe('23.00');
    expect(consumo.cuerpo.costoTotal).toBe('246.00');
    const capas = await comoPropietario<{ cantidad_restante: string; valor_restante: string }>(
      'select cantidad_restante::text, valor_restante::text from inventarios.capas where articulo_id = $1 order by fecha, secuencia',
      [peps.articuloId],
    );
    expect(capas).toEqual([
      { cantidad_restante: '0.0000', valor_restante: '0.00' },
      { cantidad_restante: '70.0000', valor_restante: '161.00' },
    ]);
    expect(await cuadreDelKardex(peps.cuenta.empresaId)).toEqual([]);
  });
});

describe('la bandeja de notas y las anulaciones', () => {
  it('una nota de una factura recibida entra a la bandeja aunque no esté marcada, y lo aplicado baja su pendiente', async () => {
    const articulo = await nuevoArticulo();
    const compra = await comprar(e, articulo, { cantidad: '100', costo: 200 });
    const sinRecibir = await factura(e, 100);
    const deLaSinRecibir = await nota(e, sinRecibir.documentoId, 10);
    const { lineaIds } = await nota(e, compra.documentoId, 50);

    const antes = (await porRecibir(e)).find((l) => l.lineaId === lineaIds[0]);
    await devolver(e, { lineaId: lineaIds[0]!, entradaId: compra.entradaId, cantidad: '10' });
    const despues = (await porRecibir(e)).find((l) => l.lineaId === lineaIds[0]);

    expect(antes).toMatchObject({
      tipoDeDocumento: 'nota_de_credito',
      costo: '50.00',
      recibido: '0.00',
      pendiente: '50.00',
    });
    expect(despues).toMatchObject({ recibido: '20.00', pendiente: '30.00' });
    expect((await porRecibir(e)).map((l) => l.lineaId)).not.toContain(deLaSinRecibir.lineaIds[0]);
  });

  it('una recepción con devoluciones o rebajas vigentes no se anula hasta anular ellas; todo queda en la auditoría', async () => {
    const articulo = await nuevoArticulo();
    const compra = await comprar(e, articulo, { cantidad: '100', costo: 200 });
    const { lineaIds } = await nota(e, compra.documentoId, 50);
    const lineaId = lineaIds[0]!;
    const devolucion = await devolver(e, { lineaId, entradaId: compra.entradaId, cantidad: '10' });
    const rebaja = await rebajar(e, { lineaId, monto: '5.00', dias: 4 });

    const bloqueada = await propietario().post(`${RUTA_RECEPCIONES}/${compra.recepcionId}/anular`, { motivo: 'Error' });
    const anuladaR = await propietario().post(`${RUTA_REBAJAS}/${rebaja.cuerpo.id}/anular`, { motivo: 'Error' });
    const anuladaD = await propietario().post(`${RUTA_DEVOLUCIONES}/${devolucion.cuerpo.id}/anular`, {
      motivo: 'Error',
    });
    const anulada = await propietario().post(`${RUTA_RECEPCIONES}/${compra.recepcionId}/anular`, { motivo: 'Error' });

    expect(bloqueada.cuerpo.error.codigo).toBe('recepcion_con_documentos_posteriores');
    expect([anuladaR.estado, anuladaD.estado, anulada.estado]).toEqual([200, 200, 200]);
    expect((await propietario().get(`/api/inventarios/existencias?articuloId=${articulo}`)).cuerpo).toEqual([]);
    const auditadas = await comoPropietario<{ recurso: string }>(
      "select recurso from core.auditoria where registro_id::text = any($1::text[]) and accion = 'anular' order by creado_en",
      [[rebaja.cuerpo.id, devolucion.cuerpo.id, compra.recepcionId]],
    );
    expect(auditadas.map((a) => a.recurso)).toEqual([
      'inventarios.rebajas-de-costo',
      'inventarios.devoluciones-a-proveedor',
      'inventarios.recepciones',
    ]);
  });

  it('anular una rebaja y una devolución restituye el costo y la existencia, y el pendiente de la nota', async () => {
    const articulo = await nuevoArticulo();
    const compra = await comprar(e, articulo, { cantidad: '100', costo: 200 });
    const { lineaIds } = await nota(e, compra.documentoId, 50);
    const lineaId = lineaIds[0]!;
    const devolucion = await devolver(e, { lineaId, entradaId: compra.entradaId, cantidad: '10' });
    const rebaja = await rebajar(e, { lineaId, monto: '5.00', dias: 4 });

    await propietario().post(`${RUTA_REBAJAS}/${rebaja.cuerpo.id}/anular`, { motivo: 'Error' });
    await propietario().post(`${RUTA_DEVOLUCIONES}/${devolucion.cuerpo.id}/anular`, { motivo: 'Error' });

    const kardex = await kardexDe(propietario(), articulo);
    expect(kardex.renglones).toHaveLength(1);
    expect(kardex.renglones[0]).toMatchObject({ saldoCantidad: '100.0000', saldoValor: '200.00' });
    expect((await porRecibir(e)).find((l) => l.lineaId === lineaId)).toMatchObject({ pendiente: '50.00' });
  });
});
