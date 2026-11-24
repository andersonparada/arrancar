/**
 * Cambiar la fecha de inicio y devolverla no debe alterar la fecha real de compra de una capa propia (INV-7, §8): el
 * cambio que la confundiría con la capa sin fecha propia se rechaza y la capa queda donde estaba.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import type { EscenarioDeKardex } from './soporte/escenario-de-kardex.js';
import { fijarFechaDeInicio } from './soporte/escenario-de-saldos-de-activos.js';
import {
  datosDeSaldoInicial,
  prepararSaldos,
  SALDOS_DE_INVENTARIO,
} from './soporte/escenario-de-saldos-de-inventario.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;

const capas = () =>
  comoPropietario<{ fecha: string }>(
    `select fecha::text as fecha from inventarios.capas where empresa_id = $1 order by fecha`,
    [e.cuenta.empresaId],
  );

beforeAll(async () => {
  e = await prepararSaldos(entorno, 'saldosidayvuelta', { metodo: 'peps' });
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('la fecha de inicio de ida y vuelta', () => {
  it('rechaza el cambio que confundiría la capa propia y la deja en su fecha', async () => {
    const carga = await e.cuenta.propietario.post(SALDOS_DE_INVENTARIO, {
      ...datosDeSaldoInicial(e, '5', '10.00'),
      fechaDeCapa: '2026-06-30',
    });
    expect(carga.estado, JSON.stringify(carga.cuerpo)).toBe(201);

    const ida = await fijarFechaDeInicio(e.cuenta, '2026-07-01');
    const vuelta = await fijarFechaDeInicio(e.cuenta, '2026-09-01');

    expect(ida.estado).toBe(422);
    expect(ida.cuerpo.error.codigo).toBe('inventario_con_fecha_fuera_de_la_carga');
    expect(vuelta.estado).toBe(200);
    expect(await capas()).toEqual([{ fecha: '2026-06-30' }]);
  });
});
