/**
 * Cerrar un mes contra cambiar la fecha de inicio de la empresa: el cambio de fecha toma la fila de la carga inicial y
 * el cierre la lee compartida antes del candado del cierre; el aviso de la fecha no pide ese candado, así que no hay
 * interbloqueo. Cada ronda solo puede terminar en 200 o 422, nunca en 500.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { cerrarMes, reabrirMes } from './soporte/escenario-de-cierres.js';
import { entrada, prepararKardex, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
const RONDAS = 15;
let e: EscenarioDeKardex;

const propietario = () => e.cuenta.propietario;
const cambiarFecha = (fechaDeInicio: string) =>
  propietario().put(`/api/empresas/${e.cuenta.empresaId}/carga-inicial`, { fechaDeInicio });

beforeAll(async () => {
  e = await prepararKardex(entorno, 'cierresfecha');
  const compra = await entrada(propietario(), {
    bodegaId: e.bodegaId,
    fecha: '2026-07-01',
    renglones: [{ articuloId: e.articuloId, cantidad: '10', costoTotal: '200.00' }],
  });
  expect(compra.estado).toBe(201);
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('cerrar un mes contra cambiar la fecha de inicio', () => {
  it(`en ${RONDAS} rondas a la vez nadie recibe un error interno`, async () => {
    const estados: number[] = [];
    for (let ronda = 0; ronda < RONDAS; ronda++) {
      // La fecha cambia en cada ronda: el aviso a Inventarios solo sale si la fecha es otra.
      const [cierre, cambio] = await Promise.all([
        cerrarMes(propietario(), '2026-07-01'),
        cambiarFecha(`2026-06-${10 + ronda}`),
      ]);
      estados.push(cierre.estado, cambio.estado);
      if (cierre.estado === 200) await reabrirMes(propietario(), '2026-07-01');
    }

    expect(estados.filter((estado) => estado !== 200 && estado !== 422)).toEqual([]);
  });
});
