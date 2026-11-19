import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let propietario: pg.Client;

const MOTIVO = 'API de pruebas';

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Tipos de cambio', usuario: 'mtipos' });
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  await propietario.query(`delete from core.tipos_de_cambio where moneda in ('USD', 'EUR')`);
});

afterAll(async () => {
  await propietario.query(`delete from core.tipos_de_cambio where moneda in ('USD', 'EUR')`);
  await propietario.end();
});

describe('POST /api/tipos-de-cambio', () => {
  const cuerpo = { moneda: 'USD', fecha: '2026-01-05', referencia: '7.70', motivo: MOTIVO };

  it('el propietario de la cuenta no puede ingresar tipos ni ver versiones', async () => {
    const crear = await cuenta.propietario.post('/api/tipos-de-cambio', cuerpo);
    const versiones = await cuenta.propietario.get('/api/tipos-de-cambio/USD/2026-01-05/versiones');

    expect(crear.estado).toBe(403);
    expect(versiones.estado).toBe(403);
  });

  it('soporte agrega la versión con su motivo y su usuario', async () => {
    const respuesta = await entorno.soporte.post('/api/tipos-de-cambio', cuerpo);

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      moneda: 'USD',
      fecha: '2026-01-05',
      referencia: '7.7',
      origen: 'manual',
      motivo: MOTIVO,
      registradoPor: expect.any(String),
    });
  });

  it('corregir agrega una versión: la vigente es la última y las dos quedan', async () => {
    await entorno.soporte.post('/api/tipos-de-cambio', { ...cuerpo, referencia: '7.71', motivo: 'Corrección' });

    const versiones = await entorno.soporte.get('/api/tipos-de-cambio/USD/2026-01-05/versiones');
    const vigente = await cuenta.propietario.get('/api/tipos-de-cambio/vigente?moneda=USD&fecha=2026-01-05');

    expect(versiones.cuerpo.map((v: { referencia: string }) => v.referencia)).toEqual(['7.71', '7.7']);
    expect(vigente.cuerpo).toMatchObject({ referencia: '7.71', exacto: true, utilizable: true });
  });

  it('rechaza el quetzal, tipos inválidos, fechas imposibles y motivos vacíos', async () => {
    const quetzal = await entorno.soporte.post('/api/tipos-de-cambio', { ...cuerpo, moneda: 'GTQ' });
    const invalido = await entorno.soporte.post('/api/tipos-de-cambio', { ...cuerpo, referencia: '0' });
    const fecha = await entorno.soporte.post('/api/tipos-de-cambio', { ...cuerpo, fecha: '2026-02-30' });
    const sinMotivo = await entorno.soporte.post('/api/tipos-de-cambio', { ...cuerpo, motivo: '  ' });
    const inexistente = await entorno.soporte.post('/api/tipos-de-cambio', { ...cuerpo, moneda: 'XXX' });

    expect(quetzal.estado).toBe(422);
    expect(quetzal.cuerpo.error.codigo).toBe('tipo_de_cambio_del_quetzal');
    expect(invalido.estado).toBe(400);
    expect(invalido.cuerpo.error.codigo).toBe('tipo_de_cambio_invalido');
    expect(fecha.estado).toBe(400);
    expect(sinMotivo.estado).toBe(400);
    expect(inexistente.estado).toBe(404);
  });
});

describe('GET /api/tipos-de-cambio/vigente', () => {
  const vigente = (moneda: string, fecha: string) =>
    cuenta.propietario.get(`/api/tipos-de-cambio/vigente?moneda=${moneda}&fecha=${fecha}`);

  it('con un hueco usa el anterior y dice que faltó la publicación', async () => {
    await entorno.soporte.post('/api/tipos-de-cambio', {
      moneda: 'USD',
      fecha: '2026-03-02',
      referencia: '7.6',
      motivo: MOTIVO,
    });

    const respuesta = await vigente('USD', '2026-03-05');

    expect(respuesta.cuerpo).toMatchObject({
      fechaDelTipo: '2026-03-02',
      referencia: '7.6',
      exacto: false,
      motivoDelAnterior: 'falta_publicacion',
      utilizable: true,
    });
  });

  it('pasados 7 días no es utilizable, pero no lanza error', async () => {
    const respuesta = await vigente('USD', '2026-03-10');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ fechaDelTipo: '2026-03-02', utilizable: false });
  });

  it('una fecha futura no publicada no es utilizable', async () => {
    const respuesta = await vigente('USD', '2099-01-01');

    expect(respuesta.cuerpo.utilizable).toBe(false);
  });

  it('el euro, un sábado, usa el del viernes sin pedir confirmación', async () => {
    await entorno.soporte.post('/api/tipos-de-cambio', {
      moneda: 'EUR',
      fecha: '2026-03-06',
      referencia: '8.9',
      motivo: MOTIVO,
    });

    const respuesta = await vigente('EUR', '2026-03-07');

    expect(respuesta.cuerpo).toMatchObject({
      fechaDelTipo: '2026-03-06',
      motivoDelAnterior: 'dia_sin_calculo',
      utilizable: true,
    });
  });

  it('el quetzal es uno y una moneda sin tipos no es utilizable', async () => {
    expect((await vigente('GTQ', '2026-03-05')).cuerpo).toMatchObject({
      referencia: '1',
      exacto: true,
      utilizable: true,
    });
    expect((await vigente('GBP', '2026-03-05')).cuerpo).toMatchObject({ referencia: null, utilizable: false });
  });

  it('pide moneda y fecha válidas', async () => {
    expect((await cuenta.propietario.get('/api/tipos-de-cambio/vigente?moneda=USD')).estado).toBe(400);
    expect((await vigente('US', '2026-03-05')).estado).toBe(400);
  });
});

describe('GET /api/tipos-de-cambio', () => {
  const serie = (consulta: string) => cuenta.propietario.get(`/api/tipos-de-cambio?${consulta}`);

  it('devuelve la versión vigente de cada día del rango', async () => {
    const respuesta = await serie('moneda=USD&desde=2026-01-01&hasta=2026-03-31');

    const dias = respuesta.cuerpo.map((t: { fecha: string; referencia: string }) => [t.fecha, t.referencia]);
    expect(dias).toEqual([
      ['2026-01-05', '7.71'],
      ['2026-03-02', '7.6'],
    ]);
  });

  it('no muestra el motivo ni quién registró el tipo', async () => {
    const respuesta = await serie('moneda=USD&desde=2026-01-01&hasta=2026-03-31');

    expect(respuesta.cuerpo.length).toBeGreaterThan(0);
    for (const tipo of respuesta.cuerpo) {
      expect(tipo).not.toHaveProperty('motivo');
      expect(tipo).not.toHaveProperty('registradoPor');
    }
  });

  it('el rango no pasa de 366 días ni va al revés', async () => {
    expect((await serie('moneda=USD&desde=2025-01-01&hasta=2026-03-31')).estado).toBe(400);
    expect((await serie('moneda=USD&desde=2026-01-01&hasta=2026-12-31')).estado).toBe(200);
    expect((await serie('moneda=USD&desde=2026-03-31&hasta=2026-01-01')).estado).toBe(400);
  });

  it('exige sesión', async () => {
    const respuesta = await entorno
      .nuevoCliente()
      .get('/api/tipos-de-cambio?moneda=USD&desde=2026-01-01&hasta=2026-01-02');

    expect(respuesta.estado).toBe(401);
  });
});
