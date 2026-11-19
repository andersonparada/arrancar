import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/inventarios.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  crearArticulo,
  entrada,
  kardexDe,
  prepararKardex,
  salida,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
const recalculos: Array<{ diferencias: Array<{ diferenciaCentavos: number }> }> = [];

beforeAll(async () => {
  busEventos.suscribir('inventarios.costo_recalculado', (datos) => {
    recalculos.push(datos);
  });
  e = await prepararKardex(entorno, 'kardexpromedio');
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

/** Un artículo nuevo por prueba: los saldos no se mezclan. */
const articuloNuevo = () => crearArticulo(e.cuenta.propietario, e.referencias);

const dar = (articuloId: string, fecha: string, compra: { cantidad: string; costoTotal: string }) =>
  entrada(e.cuenta.propietario, { bodegaId: e.bodegaId, fecha, renglones: [{ articuloId, ...compra }] });

const sacar = (articuloId: string, fecha: string, cantidad: string) =>
  salida(e.cuenta.propietario, e, { bodegaId: e.bodegaId, fecha, renglones: [{ articuloId, cantidad }] });

describe('kardex con promedio ponderado (§7.6)', () => {
  it('costea las salidas con el promedio y se lleva el residuo al vaciar', async () => {
    const articulo = await articuloNuevo();
    await dar(articulo, '2026-01-05', { cantidad: '100', costoTotal: '200.00' });
    await dar(articulo, '2026-01-06', { cantidad: '50', costoTotal: '115.00' });

    const primera = await sacar(articulo, '2026-01-10', '40');
    const segunda = await sacar(articulo, '2026-01-11', '110');

    expect(primera.estado).toBe(201);
    expect(primera.cuerpo.renglones[0]).toMatchObject({ costoTotal: '84.00', costoUnitario: '2.100000' });
    expect(segunda.cuerpo.renglones[0]).toMatchObject({ costoTotal: '231.00' });
    const kardex = await kardexDe(e.cuenta.propietario, articulo);
    expect(
      kardex.renglones.map((r: { saldoCantidad: string; saldoValor: string }) => [r.saldoCantidad, r.saldoValor]),
    ).toEqual([
      ['100.0000', '200.00'],
      ['150.0000', '315.00'],
      ['110.0000', '231.00'],
      ['0.0000', '0.00'],
    ]);
  });

  it('recalcula las salidas posteriores si se registra una entrada con fecha anterior', async () => {
    const articulo = await articuloNuevo();
    await dar(articulo, '2026-02-01', { cantidad: '100', costoTotal: '200.00' });
    await dar(articulo, '2026-02-01', { cantidad: '50', costoTotal: '115.00' });
    const registrada = await sacar(articulo, '2026-02-01', '40');
    const antes = recalculos.length;

    await dar(articulo, '2026-02-01', { cantidad: '100', costoTotal: '260.00' });

    const documento = (await e.cuenta.propietario.get(`/api/inventarios/documentos/${registrada.cuerpo.id}`)).cuerpo;
    expect(documento.renglones[0].costoTotal).toBe('92.00');
    expect(recalculos.length).toBe(antes + 1);
    expect(recalculos.at(-1)!.diferencias.map((d) => d.diferenciaCentavos)).toEqual([800]);
  });

  it('rechaza una salida con fecha anterior a la única entrada aunque hoy haya existencia', async () => {
    const articulo = await articuloNuevo();
    await dar(articulo, '2026-03-10', { cantidad: '100', costoTotal: '200.00' });

    const respuesta = await sacar(articulo, '2026-03-09', '10');

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('existencia_negativa');
    expect(respuesta.cuerpo.error.detalles).toMatchObject({ articuloId: articulo, fecha: '2026-03-09' });
  });

  it('en el mismo día, la entrada va antes que la salida aunque se registre después', async () => {
    const articulo = await articuloNuevo();
    await dar(articulo, '2026-03-01', { cantidad: '10', costoTotal: '20.00' });
    const salidaDeLaManana = await sacar(articulo, '2026-03-02', '10');
    expect(salidaDeLaManana.estado).toBe(201);

    const compraDeLaTarde = await dar(articulo, '2026-03-02', { cantidad: '5', costoTotal: '10.00' });

    expect(compraDeLaTarde.estado).toBe(201);
  });

  it('no deja anular una entrada de la que dependen salidas posteriores', async () => {
    const articulo = await articuloNuevo();
    const compra = await dar(articulo, '2026-04-01', { cantidad: '100', costoTotal: '200.00' });
    await sacar(articulo, '2026-04-02', '30');

    const respuesta = await e.cuenta.propietario.post(`/api/inventarios/entradas/${compra.cuerpo.id}/anular`, {
      motivo: 'Error',
    });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('existencia_negativa');
  });

  it('al anular una entrada anterior se recalcula el costo de las salidas', async () => {
    const articulo = await articuloNuevo();
    await dar(articulo, '2026-05-01', { cantidad: '100', costoTotal: '200.00' });
    const cara = await dar(articulo, '2026-05-02', { cantidad: '100', costoTotal: '400.00' });
    const consumo = await sacar(articulo, '2026-05-03', '50');
    expect(consumo.cuerpo.renglones[0].costoTotal).toBe('150.00');
    const antes = recalculos.length;

    const anulada = await e.cuenta.propietario.post(`/api/inventarios/entradas/${cara.cuerpo.id}/anular`, {
      motivo: 'Entrada duplicada',
    });

    expect(anulada.estado).toBe(200);
    expect(anulada.cuerpo).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Entrada duplicada' });
    const documento = (await e.cuenta.propietario.get(`/api/inventarios/documentos/${consumo.cuerpo.id}`)).cuerpo;
    expect(documento.renglones[0].costoTotal).toBe('100.00');
    expect(recalculos.length).toBe(antes + 1);
    expect(recalculos.at(-1)!.diferencias.map((d) => d.diferenciaCentavos)).toEqual([-5000]);
  });
});
