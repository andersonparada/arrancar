import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let propietario: pg.Client;

async function limpiar(): Promise<void> {
  await propietario.query(`delete from core.consultas_al_banguat where vuelta = 'muestra'`);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Muestra del Banguat', usuario: 'mmuestra' });
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  await limpiar();
});

afterAll(async () => {
  await limpiar();
  await propietario.end();
});

describe('GET /api/tipos-de-cambio/consultas', () => {
  it('el propietario de la cuenta no la ve', async () => {
    expect((await cuenta.propietario.get('/api/tipos-de-cambio/consultas')).estado).toBe(403);
  });

  it('soporte ve el estado de las series con código y la bitácora reciente, sin quién disparó', async () => {
    await propietario.query(
      `insert into core.consultas_al_banguat (iniciada_en, terminada_en, operacion, vuelta, resultado)
       values (now(), now(), 'VariablesDisponibles', 'muestra', 'exito')`,
    );

    const respuesta = await entorno.soporte.get('/api/tipos-de-cambio/consultas?limite=5');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.hoy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(respuesta.cuerpo.series).toEqual(
      expect.arrayContaining([expect.objectContaining({ moneda: 'USD', codigoBanguat: 2, activa: true })]),
    );
    expect(respuesta.cuerpo.consultas.length).toBeLessThanOrEqual(5);
    expect(respuesta.cuerpo.consultas[0]).toMatchObject({ vuelta: 'muestra', aPedido: false });
    expect(respuesta.cuerpo.consultas[0]).not.toHaveProperty('disparadaPor');
  });

  it('rechaza un límite fuera de rango', async () => {
    expect((await entorno.soporte.get('/api/tipos-de-cambio/consultas?limite=5000')).estado).toBe(400);
  });
});

describe('GET /api/monedas/banguat/:codigo/muestra', () => {
  it('el propietario de la cuenta no la ve', async () => {
    expect((await cuenta.propietario.get('/api/monedas/banguat/24/muestra')).estado).toBe(403);
  });

  it('un código que el Banguat no ofrece da 422 y no llama al servicio', async () => {
    const respuesta = await entorno.soporte.get('/api/monedas/banguat/31000/muestra');

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('codigo_del_banguat_no_ofrecido');
  });

  it('con el Banguat fuera de alcance responde el error, deja su fila y no guarda tipos; la 11.ª en un minuto da 429', async () => {
    const respuesta = await entorno.soporte.get('/api/monedas/banguat/24/muestra?moneda=EUR');

    const bitacora = await propietario.query(
      `select moneda, codigo_banguat, resultado, disparada_por is not null as con_usuario
         from core.consultas_al_banguat where vuelta = 'muestra' and codigo_banguat = 24`,
    );
    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ codigo: 24, descripcion: 'Euro', resultado: 'error', valores: [] });
    expect(bitacora.rows).toEqual([{ moneda: 'EUR', codigo_banguat: 24, resultado: 'error', con_usuario: true }]);

    const estados: number[] = [];
    for (let i = 0; i < 10; i++) estados.push((await entorno.soporte.get('/api/monedas/banguat/24/muestra')).estado);
    expect(estados.at(-1)).toBe(429);
  });
});
