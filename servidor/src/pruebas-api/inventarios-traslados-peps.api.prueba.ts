import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  crearBodega,
  entrada,
  kardexDe,
  prepararKardex,
  salida,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';
import { fijarTransito, recibir, trasladar } from './soporte/escenario-de-traslados.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
let principal: string;
let otra: string;

const capas = () =>
  comoPropietario<{ cantidad_restante: string; valor_restante: string }>(
    `select cantidad_restante::text, valor_restante::text from inventarios.capas
      where articulo_id = $1 and vigente order by fecha, secuencia`,
    [e.articuloId],
  );

const traslado = (cantidad: string, fecha: string) =>
  trasladar(e.cuenta.propietario, {
    origen: principal,
    destino: otra,
    fecha,
    renglones: [{ articuloId: e.articuloId, cantidad }],
  });

beforeAll(async () => {
  e = await prepararKardex(entorno, 'traspeps');
  principal = e.bodegaId;
  otra = await crearBodega(e.cuenta.propietario);
  expect((await e.cuenta.propietario.post('/api/inventarios/metodo-de-costeo', { metodo: 'peps' })).estado).toBe(200);
  const compra = (fecha: string, cantidad: string, costoTotal: string) =>
    entrada(e.cuenta.propietario, {
      bodegaId: principal,
      fecha,
      renglones: [{ articuloId: e.articuloId, cantidad, costoTotal }],
    });
  await compra('2026-07-01', '100', '200.00');
  await compra('2026-07-02', '50', '115.00');
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('traslado con PEPS', () => {
  it('no cambia el orden de consumo: la salida siguiente agota la capa más vieja primero', async () => {
    expect((await traslado('30', '2026-07-03')).estado).toBe(201);

    const consumo = await salida(e.cuenta.propietario, e, {
      bodegaId: principal,
      fecha: '2026-07-04',
      renglones: [{ articuloId: e.articuloId, cantidad: '120' }],
    });

    expect(consumo.cuerpo.costoTotal).toBe('246.00');
    expect(await capas()).toEqual([
      { cantidad_restante: '0.0000', valor_restante: '0.00' },
      { cantidad_restante: '30.0000', valor_restante: '69.00' },
    ]);
  });

  it('no crea capas: las dos mitades del traslado no son entradas', async () => {
    expect(await capas()).toHaveLength(2);
  });

  it('lo que viaja en tránsito sigue en el valor del artículo y en sus capas', async () => {
    await fijarTransito(entorno, e, true);
    const antes = (await kardexDe(e.cuenta.propietario, e.articuloId)).renglones.at(-1);

    const enviado = await trasladar(e.cuenta.propietario, {
      origen: otra,
      destino: principal,
      fecha: '2026-07-05',
      renglones: [{ articuloId: e.articuloId, cantidad: '10' }],
    });

    const despues = (await kardexDe(e.cuenta.propietario, e.articuloId)).renglones.at(-1);
    expect(enviado.cuerpo.estadoDeTraslado).toBe('en_transito');
    expect([despues.saldoCantidad, despues.saldoValor]).toEqual([antes.saldoCantidad, antes.saldoValor]);
    expect(await capas()).toEqual([
      { cantidad_restante: '0.0000', valor_restante: '0.00' },
      { cantidad_restante: '30.0000', valor_restante: '69.00' },
    ]);
    expect((await recibir(e.cuenta.propietario, enviado.cuerpo.id, { fecha: '2026-07-06' })).estado).toBe(200);
    await fijarTransito(entorno, e, false);
  });
});
