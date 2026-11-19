import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let propietario: pg.Client;

beforeAll(async () => {
  const cuenta = await darDeAltaCuenta(entorno, { nombre: 'QA Multimoneda', usuario: 'mqamm' });
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  await propietario.query(`delete from core.tipos_de_cambio where moneda = 'USD'`);
});

afterAll(async () => {
  await propietario.query(`delete from core.tipos_de_cambio where moneda = 'USD'`);
  await propietario.end();
});

/** Hallazgos de la QA de Multimoneda (2026-11-19): el ingreso manual de soporte es más laxo que la carga del Banguat. */
describe('POST /api/tipos-de-cambio: ingreso manual (hallazgos de la QA)', () => {
  const base = { moneda: 'USD', motivo: 'QA' };

  it.fails('rechaza una fecha futura lejana (la carga del Banguat no acepta más allá de mañana)', async () => {
    const respuesta = await entorno.soporte.post('/api/tipos-de-cambio', {
      ...base,
      fecha: '2099-01-01',
      referencia: '7.7',
    });
    expect(respuesta.estado).toBe(422);
  });

  it.fails('rechaza una compra mayor que la venta', async () => {
    const respuesta = await entorno.soporte.post('/api/tipos-de-cambio', {
      ...base,
      fecha: '2026-01-06',
      referencia: '7.7',
      compra: '9',
      venta: '5',
    });
    expect(respuesta.estado).toBe(400);
  });
});
