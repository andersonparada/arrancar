/**
 * La primera fecha de inicio también se consulta a Inventarios (§8): no puede quedar después de un movimiento ni de un
 * mes ya cerrado.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { cerrarMes } from './soporte/escenario-de-cierres.js';
import { entrada, prepararKardex, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;

const propietario = () => e.cuenta.propietario;
const fijarFecha = (fechaDeInicio: string) =>
  propietario().put(`/api/empresas/${e.cuenta.empresaId}/carga-inicial`, { fechaDeInicio });

beforeAll(async () => {
  e = await prepararKardex(entorno, 'iniciopv');
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('fijar la fecha de inicio por primera vez', () => {
  it('se rechaza si ya hay un movimiento anterior y un mes cerrado', async () => {
    const compra = await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-05-10',
      renglones: [{ articuloId: e.articuloId, cantidad: '10', costoTotal: '20.00' }],
    });
    expect(compra.estado).toBe(201);
    expect((await cerrarMes(propietario(), '2026-05-01')).estado).toBe(200);

    const rechazo = await fijarFecha('2026-08-01');

    expect(rechazo.estado).toBe(422);
    expect(rechazo.cuerpo.error.codigo).toBe('inventario_con_fecha_fuera_de_la_carga');
  });
});
