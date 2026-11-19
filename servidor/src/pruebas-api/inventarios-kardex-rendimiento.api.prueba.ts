import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  crearArticulo,
  entrada,
  prepararKardex,
  salida,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
const MOVIMIENTOS_POR_TIPO = 2500;
let e: EscenarioDeKardex;
let articulo: string;

const sembrarKardex = async (documentoDeEntrada: string, documentoDeSalida: string) => {
  const comunes = [e.cuenta.empresaId, articulo, e.bodegaId];
  // Entradas de 10 lb a Q2.00 y salidas de 5 lb a Q2.00, con los saldos que el motor daría (el promedio no se mueve).
  await comoPropietario(
    `insert into inventarios.movimientos (empresa_id, documento_id, articulo_id, bodega_id, fecha, orden_del_dia, tipo,
       cantidad, costo_unitario, costo_total, costo_del_metodo, saldo_cantidad, saldo_valor)
     select $1, $4, $2, $3, date '2026-08-01' + (i / 100), 0, 'entrada', 10, 2, 20, false, 10 * i, 20 * i
       from generate_series(1, ${MOVIMIENTOS_POR_TIPO}) i order by i`,
    [...comunes, documentoDeEntrada],
  );
  await comoPropietario(
    `insert into inventarios.movimientos (empresa_id, documento_id, articulo_id, bodega_id, fecha, orden_del_dia, tipo,
       cantidad, costo_unitario, costo_total, costo_del_metodo, saldo_cantidad, saldo_valor)
     select $1, $4, $2, $3, date '2026-09-01' + (i / 100), 2, 'salida', -5, 2, -10, true,
            25000 - 5 * i, 50000 - 10 * i
       from generate_series(1, ${MOVIMIENTOS_POR_TIPO}) i order by i`,
    [...comunes, documentoDeSalida],
  );
  await comoPropietario(
    `insert into inventarios.existencias (empresa_id, bodega_id, articulo_id, cantidad) values ($1, $3, $2, 12500)`,
    comunes,
  );
  await comoPropietario(
    `insert into inventarios.saldos_de_articulos (empresa_id, articulo_id, cantidad, valor, costo_promedio)
     values ($1, $2, 12500, 25000, 2)`,
    [e.cuenta.empresaId, articulo],
  );
};

beforeAll(async () => {
  e = await prepararKardex(entorno, 'kardexrendimiento');
  const semilla = await crearArticulo(e.cuenta.propietario, e.referencias);
  articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
  const compra = await entrada(e.cuenta.propietario, {
    bodegaId: e.bodegaId,
    fecha: '2026-07-01',
    renglones: [{ articuloId: semilla, cantidad: '2', costoTotal: '4.00' }],
  });
  const consumo = await salida(e.cuenta.propietario, e, {
    bodegaId: e.bodegaId,
    fecha: '2026-07-02',
    renglones: [{ articuloId: semilla, cantidad: '1' }],
  });
  await sembrarKardex(compra.cuerpo.id, consumo.cuerpo.id);
});

describe('recálculo de un artículo de mucho uso (R-4)', () => {
  it('con 5,000 movimientos en dos meses, una entrada anterior recalcula todo en pocos segundos y deja el cuadre', async () => {
    expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);

    const inicio = Date.now();
    const respuesta = await entrada(e.cuenta.propietario, {
      bodegaId: e.bodegaId,
      fecha: '2026-07-31',
      renglones: [{ articuloId: articulo, cantidad: '10', costoTotal: '100000.00' }],
    });
    const segundos = (Date.now() - inicio) / 1000;

    expect(respuesta.estado).toBe(201);
    expect(segundos).toBeLessThan(30);
    const [recalculo] = await comoPropietario<{ salidas_afectadas: number; diferencia_de_costo: string }>(
      `select salidas_afectadas, diferencia_de_costo::text from inventarios.recalculos where articulo_id = $1`,
      [articulo],
    );
    expect(recalculo!.salidas_afectadas).toBe(MOVIMIENTOS_POR_TIPO);
    expect(Number(recalculo!.diferencia_de_costo)).toBeGreaterThan(0);
    expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
  }, 120_000);
});
