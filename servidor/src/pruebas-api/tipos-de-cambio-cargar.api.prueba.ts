import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let propietario: pg.Client;
/** La misma clave del cerrojo de la carga (`cerrojo-de-carga.drizzle.ts`). */
const CLAVE_DEL_CERROJO = 7_301_913_002;

async function limpiar(): Promise<void> {
  await propietario.query(`delete from core.tipos_de_cambio where moneda = 'USD'`);
  await propietario.query(`delete from core.consultas_al_banguat where vuelta in ('manual', 'lista')`);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Carga de tipos', usuario: 'mcarga' });
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  await limpiar();
});

afterAll(async () => {
  await limpiar();
  await propietario.end();
});

describe('POST /api/tipos-de-cambio/cargar', () => {
  it('el propietario de la cuenta no puede cargar ni actualizar la lista de monedas', async () => {
    const cargar = await cuenta.propietario.post('/api/tipos-de-cambio/cargar', {});
    const lista = await cuenta.propietario.post('/api/monedas/banguat/actualizar', {});

    expect(cargar.estado).toBe(403);
    expect(lista.estado).toBe(403);
  });

  it('rechaza un rango al revés, de más de 366 días o más allá de mañana', async () => {
    const alReves = await entorno.soporte.post('/api/tipos-de-cambio/cargar', {
      desde: '2026-11-18',
      hasta: '2026-11-10',
    });
    const largo = await entorno.soporte.post('/api/tipos-de-cambio/cargar', {
      desde: '2024-01-01',
      hasta: '2026-01-01',
    });
    const futuro = await entorno.soporte.post('/api/tipos-de-cambio/cargar', {
      desde: '2035-01-01',
      hasta: '2035-01-02',
    });
    const invalida = await entorno.soporte.post('/api/tipos-de-cambio/cargar', { desde: '2026-02-30' });

    for (const respuesta of [alReves, largo, futuro]) {
      expect(respuesta.estado).toBe(400);
      expect(respuesta.cuerpo.error.codigo).toBe('rango_de_carga_invalido');
    }
    expect(invalida.estado).toBe(400);
  });

  it('si otra carga corre, «Cargar ahora» y «Actualizar lista» responden 409', async () => {
    const otra = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await otra.connect();
    await otra.query('select pg_advisory_lock($1)', [CLAVE_DEL_CERROJO]);
    try {
      const cargar = await entorno.soporte.post('/api/tipos-de-cambio/cargar', {});
      const lista = await entorno.soporte.post('/api/monedas/banguat/actualizar', {});

      expect(cargar.estado).toBe(409);
      expect(cargar.cuerpo.error.codigo).toBe('carga_del_banguat_en_curso');
      expect(lista.estado).toBe(409);
    } finally {
      await otra.query('select pg_advisory_unlock($1)', [CLAVE_DEL_CERROJO]);
      await otra.end();
    }
  });

  it('con el Banguat fuera de alcance responde la consulta hecha y deja el error en la bitácora, sin tipos', async () => {
    const respuesta = await entorno.soporte.post('/api/tipos-de-cambio/cargar', {});

    const { rows } = await propietario.query(
      `select vuelta, resultado, disparada_por is not null as con_usuario from core.consultas_al_banguat where vuelta = 'manual'`,
    );
    const tipos = await propietario.query(`select 1 from core.tipos_de_cambio where moneda = 'USD'`);
    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toEqual([expect.objectContaining({ moneda: 'USD', resultado: 'error', filasNuevas: 0 })]);
    expect(rows).toEqual([{ vuelta: 'manual', resultado: 'error', con_usuario: true }]);
    expect(tipos.rowCount).toBe(0);
  });

  it('actualizar la lista con el Banguat fuera de alcance no toca la lista y queda en la bitácora', async () => {
    const antes = await propietario.query(`select count(*)::int as n from core.monedas_del_banguat where disponible`);

    const respuesta = await entorno.soporte.post('/api/monedas/banguat/actualizar', {});

    const despues = await propietario.query(`select count(*)::int as n from core.monedas_del_banguat where disponible`);
    const bitacora = await propietario.query(`select resultado from core.consultas_al_banguat where vuelta = 'lista'`);
    expect(respuesta.estado).toBe(200);
    expect(despues.rows[0].n).toBe(antes.rows[0].n);
    expect(bitacora.rows).toEqual([{ resultado: 'error' }]);
  });
});
