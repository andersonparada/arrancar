import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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

const dar = (articuloId: string, compra: { cantidad: string; costoTotal: string }, fecha = '2026-06-01') =>
  entrada(e.cuenta.propietario, { bodegaId: e.bodegaId, fecha, renglones: [{ articuloId, ...compra }] });

beforeAll(async () => {
  e = await prepararKardex(entorno, 'kardexconcurrencia');
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('concurrencia en el kardex (R-5)', () => {
  it('dos salidas a la vez que juntas no caben: una se guarda y la otra se rechaza', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    await dar(articulo, { cantidad: '100', costoTotal: '200.00' });
    const sacar = () =>
      salida(e.cuenta.propietario, e, {
        bodegaId: e.bodegaId,
        fecha: '2026-06-02',
        renglones: [{ articuloId: articulo, cantidad: '60' }],
      });

    const respuestas = await Promise.all([sacar(), sacar()]);

    expect(respuestas.map((r) => r.estado).sort()).toEqual([201, 422]);
    expect(respuestas.find((r) => r.estado === 422)!.cuerpo.error.codigo).toBe('existencia_negativa');
    const kardex = await kardexDe(e.cuenta.propietario, articulo);
    expect(kardex.renglones.at(-1)).toMatchObject({ saldoCantidad: '40.0000', saldoValor: '80.00' });
  });

  it('varias salidas a la vez dan el mismo kardex que si fueran una tras otra', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    await dar(articulo, { cantidad: '100', costoTotal: '200.00' });
    const sacar = (cantidad: string) =>
      salida(e.cuenta.propietario, e, {
        bodegaId: e.bodegaId,
        fecha: '2026-06-02',
        renglones: [{ articuloId: articulo, cantidad }],
      });

    const respuestas = await Promise.all(['10', '20', '30', '40'].map(sacar));

    expect(respuestas.map((r) => r.estado)).toEqual([201, 201, 201, 201]);
    const kardex = await kardexDe(e.cuenta.propietario, articulo);
    expect(kardex.renglones.at(-1)).toMatchObject({ saldoCantidad: '0.0000', saldoValor: '0.00' });
    const costos = kardex.renglones.slice(1).map((r: { costoTotal: string }) => Number(r.costoTotal));
    expect(costos.reduce((suma: number, costo: number) => suma + costo, 0)).toBeCloseTo(-200, 2);
  });

  it('documentos con los mismos artículos en orden contrario no se bloquean entre sí (hasta 8 a la vez: el grupo de conexiones es de 10)', async () => {
    const a = await crearArticulo(e.cuenta.propietario, e.referencias);
    const b = await crearArticulo(e.cuenta.propietario, e.referencias);
    const renglones = (...ids: string[]) =>
      ids.map((articuloId) => ({ articuloId, cantidad: '5', costoTotal: '10.00' }));
    const registrar = (ids: string[]) =>
      entrada(e.cuenta.propietario, { bodegaId: e.bodegaId, fecha: '2026-06-03', renglones: renglones(...ids) });

    const respuestas = await Promise.all(Array.from({ length: 8 }, (_, i) => registrar(i % 2 === 0 ? [a, b] : [b, a])));

    expect(respuestas.every((r) => r.estado === 201)).toBe(true);
    expect((await kardexDe(e.cuenta.propietario, a)).renglones.at(-1)).toMatchObject({ saldoCantidad: '40.0000' });
  });
});
