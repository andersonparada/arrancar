import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  crearArticulo,
  crearBodega,
  entrada,
  kardexDe,
  prepararKardex,
  salida,
} from './soporte/escenario-de-kardex.js';
import type { EscenarioDeKardex } from './soporte/escenario-de-kardex.js';
import {
  anularTraslado,
  existenciasPorBodega,
  fijarTransito,
  recibir,
  trasladar,
} from './soporte/escenario-de-traslados.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
let principal: string;
let otra: string;
let articulo: string;

const traslado = (cantidad: string, cambios: Record<string, unknown> = {}) =>
  trasladar(e.cuenta.propietario, {
    origen: principal,
    destino: otra,
    renglones: [{ articuloId: articulo, cantidad }],
    ...cambios,
  });

const saldoDelArticulo = async () => {
  const kardex = await kardexDe(e.cuenta.propietario, articulo);
  const ultimo = kardex.renglones.at(-1);
  return [ultimo.saldoCantidad, ultimo.saldoValor];
};

beforeAll(async () => {
  e = await prepararKardex(entorno, 'trasapi');
  principal = e.bodegaId;
  otra = await crearBodega(e.cuenta.propietario);
  articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
  const compra = (fecha: string, cantidad: string, costoTotal: string) =>
    entrada(e.cuenta.propietario, {
      bodegaId: principal,
      fecha,
      renglones: [{ articuloId: articulo, cantidad, costoTotal }],
    });
  await compra('2026-07-01', '100', '200.00');
  await compra('2026-07-02', '50', '115.00');
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('traslado sin tránsito (por omisión)', () => {
  it('mueve las bodegas, no cambia el costo ni el valor y deja las dos mitades ligadas', async () => {
    const antes = await saldoDelArticulo();

    const respuesta = await traslado('50');

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ clase: 'salida_de_traslado', estadoDeTraslado: 'recibido', numero: 1 });
    expect(await existenciasPorBodega(e.cuenta.propietario, articulo)).toEqual({
      [principal]: '100.0000',
      [otra]: '50.0000',
    });
    expect(await saldoDelArticulo()).toEqual(antes);
    expect(antes).toEqual(['150.0000', '315.00']);
    const documentos = (await e.cuenta.propietario.get('/api/inventarios/documentos?clase=entrada_de_traslado')).cuerpo;
    expect(documentos).toHaveLength(1);
    expect(documentos[0]).toMatchObject({ bodegaId: otra, documentoRelacionadoId: respuesta.cuerpo.id });
  });

  it('un consumo posterior cuesta lo mismo que si el traslado no hubiera ocurrido (promedio)', async () => {
    const consumo = await salida(e.cuenta.propietario, e, {
      bodegaId: otra,
      fecha: '2026-07-10',
      renglones: [{ articuloId: articulo, cantidad: '10' }],
    });

    expect(consumo.estado).toBe(201);
    expect(consumo.cuerpo.costoTotal).toBe('21.00');
  });

  it('el kardex de la bodega muestra el traslado con su cantidad y sin valor', async () => {
    const kardex = await kardexDe(e.cuenta.propietario, articulo, `?bodegaId=${otra}`);

    const fila = kardex.renglones.find((r: { tipo: string }) => r.tipo === 'traslado');
    expect(fila).toMatchObject({ entrada: '50.0000', costoUnitario: null, costoTotal: null });
  });

  it('las dos mitades guardan un costo informativo y no suman al valor', async () => {
    const filas = await comoPropietario<{ tipo: string; costo_total: string }>(
      `select tipo, costo_total::text from inventarios.movimientos where empresa_id = $1 and tipo = 'traslado' order by secuencia`,
      [e.cuenta.empresaId],
    );

    expect(filas.map((f) => f.costo_total)).toEqual(['-105.00', '105.00']);
  });

  it('el destino debe ser otra bodega y existir en la empresa', async () => {
    const igual = await traslado('1', { destino: principal });
    const inexistente = await traslado('1', { destino: '11111111-1111-4111-8111-111111111111' });
    const sobrepasa = await traslado('1000');

    expect([igual.estado, igual.cuerpo.error.codigo]).toEqual([422, 'traslado_a_la_misma_bodega']);
    expect(inexistente.estado).toBe(404);
    expect([sobrepasa.estado, sobrepasa.cuerpo.error.codigo]).toEqual([422, 'existencia_negativa']);
  });

  it('la boleta lleva número, origen, destino, artículos y firmas, y nunca costos', async () => {
    const lista = (await e.cuenta.propietario.get('/api/inventarios/documentos?clase=salida_de_traslado')).cuerpo;

    const boleta = await e.cuenta.propietario.get(`/api/inventarios/documentos/${lista[0].id}/boleta`);

    expect(boleta.estado).toBe(200);
    expect(boleta.cuerpo).toMatchObject({
      numero: 1,
      estado: 'recibido',
      entregadoA: 'Pedro',
      renglones: [{ cantidad: '50.0000' }],
    });
    expect(boleta.cuerpo.origen).toBeTruthy();
    expect(boleta.cuerpo.destino).toBeTruthy();
    expect(boleta.cuerpo.entregadoPor).toBeTruthy();
    expect(boleta.cuerpo.recibidoPor).toBeTruthy();
    expect(JSON.stringify(boleta.cuerpo)).not.toMatch(/costo|valor/i);
    const deLaEntrada = (await e.cuenta.propietario.get('/api/inventarios/documentos?clase=entrada_de_traslado'))
      .cuerpo;
    expect(
      (await e.cuenta.propietario.get(`/api/inventarios/documentos/${deLaEntrada[0].id}/boleta`)).cuerpo.numero,
    ).toBe(1);
    const deEntrada = await e.cuenta.propietario.get(
      `/api/inventarios/documentos/${lista[0].documentoRelacionadoId}/boleta`,
    );
    expect(deEntrada.estado).toBe(200);
  });

  it('solo los traslados tienen boleta', async () => {
    const entradas = (await e.cuenta.propietario.get('/api/inventarios/documentos?clase=entrada_manual')).cuerpo;

    const respuesta = await e.cuenta.propietario.get(`/api/inventarios/documentos/${entradas[0].id}/boleta`);

    expect([respuesta.estado, respuesta.cuerpo.error.codigo]).toEqual([400, 'documento_invalido']);
  });

  it('anular deja las dos mitades anuladas, devuelve las bodegas y audita cada una', async () => {
    const enviado = (await traslado('20')).cuerpo;

    const anulado = await anularTraslado(e.cuenta.propietario, enviado.id);

    expect(anulado.cuerpo.estado).toBe('anulado');
    expect(await existenciasPorBodega(e.cuenta.propietario, articulo)).toEqual({
      [principal]: '100.0000',
      [otra]: '40.0000',
    });
    const auditoria = await comoPropietario<{ recurso: string; accion: string }>(
      `select recurso, accion from core.auditoria where empresa_id = $1 and recurso = 'inventarios.traslados' order by creado_en`,
      [e.cuenta.empresaId],
    );
    expect(auditoria).toEqual([
      { recurso: 'inventarios.traslados', accion: 'anular' },
      { recurso: 'inventarios.traslados', accion: 'anular' },
    ]);
  });

  it('no se anula un traslado cuya mercadería ya se gastó en el destino', async () => {
    const enviado = (await traslado('30', { fecha: '2026-07-11' })).cuerpo;
    await salida(e.cuenta.propietario, e, {
      bodegaId: otra,
      fecha: '2026-07-12',
      renglones: [{ articuloId: articulo, cantidad: '65' }],
    });

    const anulado = await anularTraslado(e.cuenta.propietario, enviado.id);

    expect([anulado.estado, anulado.cuerpo.error.codigo]).toEqual([422, 'existencia_negativa']);
  });
});

describe('traslado con tránsito', () => {
  beforeAll(() => fijarTransito(entorno, e, true));
  afterAll(() => fijarTransito(entorno, e, false));

  it('la salida queda en tránsito: no entra a ninguna bodega y el valor sigue en el artículo', async () => {
    const antes = await saldoDelArticulo();
    const antesPorBodega = await existenciasPorBodega(e.cuenta.propietario, articulo);

    const enviado = await traslado('10', { fecha: '2026-07-13' });

    expect(enviado.cuerpo).toMatchObject({ estadoDeTraslado: 'en_transito' });
    const despues = await existenciasPorBodega(e.cuenta.propietario, articulo);
    expect(despues[principal]).toBe((Number(antesPorBodega[principal]) - 10).toFixed(4));
    expect(despues[otra]).toBe(antesPorBodega[otra]);
    expect(await saldoDelArticulo()).toEqual(antes);
    const porRecibir = (
      await e.cuenta.propietario.get('/api/inventarios/documentos?estado=vigente&estadoDeTraslado=en_transito')
    ).cuerpo;
    expect(porRecibir.map((d: { id: string }) => d.id)).toEqual([enviado.cuerpo.id]);
  });

  it('recibir crea la entrada, la deja ligada y no se puede repetir', async () => {
    const [enTransito] = (
      await e.cuenta.propietario.get('/api/inventarios/documentos?estado=vigente&estadoDeTraslado=en_transito')
    ).cuerpo;
    const antes = await existenciasPorBodega(e.cuenta.propietario, articulo);

    const recibido = await recibir(e.cuenta.propietario, enTransito.id, { fecha: '2026-07-14' });
    const otraVez = await recibir(e.cuenta.propietario, enTransito.id);

    expect(recibido.cuerpo.estadoDeTraslado).toBe('recibido');
    expect((await existenciasPorBodega(e.cuenta.propietario, articulo))[otra]).toBe(
      (Number(antes[otra]) + 10).toFixed(4),
    );
    expect([otraVez.estado, otraVez.cuerpo.error.codigo]).toEqual([422, 'traslado_ya_recibido']);
    const entradas = (await e.cuenta.propietario.get('/api/inventarios/documentos?clase=entrada_de_traslado')).cuerpo;
    expect(entradas.find((d: { fecha: string }) => d.fecha === '2026-07-14')).toBeTruthy();
  });

  it('la recepción no puede ser anterior a la salida', async () => {
    const enviado = (await traslado('5', { fecha: '2026-07-15' })).cuerpo;

    const antes = await recibir(e.cuenta.propietario, enviado.id, { fecha: '2026-07-14' });
    const despues = await recibir(e.cuenta.propietario, enviado.id, { fecha: '2026-07-15' });

    expect([antes.estado, antes.cuerpo.error.codigo]).toEqual([400, 'documento_invalido']);
    expect(despues.estado).toBe(200);
  });

  it('en tránsito se anula entero y devuelve la cantidad al origen', async () => {
    const enviado = (await traslado('5', { fecha: '2026-07-16' })).cuerpo;
    const antes = await existenciasPorBodega(e.cuenta.propietario, articulo);

    const anulado = await anularTraslado(e.cuenta.propietario, enviado.id);
    const recibirAnulado = await recibir(e.cuenta.propietario, enviado.id);

    expect(anulado.cuerpo.estado).toBe('anulado');
    expect((await existenciasPorBodega(e.cuenta.propietario, articulo))[principal]).toBe(
      (Number(antes[principal]) + 5).toFixed(4),
    );
    expect([recibirAnulado.estado, recibirAnulado.cuerpo.error.codigo]).toEqual([422, 'documento_ya_anulado']);
  });
});
