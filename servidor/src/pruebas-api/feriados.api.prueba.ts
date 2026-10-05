import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

type Feriado = { id: string | null; fecha: string; nombre: string; origen: string; medioDia: boolean };

/** Lo auditado de un registro, leído como propietario de la base (la app solo puede agregar). */
async function auditoriaDe(registroId: string) {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query('select recurso, accion, anterior from core.auditoria where registro_id = $1', [
    registroId,
  ]);
  await conexion.end();
  return rows;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Barrios', usuario: 'ebarrios' });
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
});

describe('GET /api/feriados', () => {
  it('cualquier usuario con sesión lee los feriados calculados del año', async () => {
    const respuesta = await cuenta.propietario.get('/api/feriados?anio=2026');

    const fechas = respuesta.cuerpo.map((f: Feriado) => f.fecha);
    expect(respuesta.estado).toBe(200);
    expect(fechas).toContain('2026-10-20');
    expect(fechas).toContain('2026-04-03');
    expect(respuesta.cuerpo.find((f: Feriado) => f.fecha === '2026-12-24')).toMatchObject({ medioDia: true });
  });

  it('pide el año y lo valida', async () => {
    expect((await cuenta.propietario.get('/api/feriados')).estado).toBe(400);
    expect((await cuenta.propietario.get('/api/feriados?anio=1800')).estado).toBe(400);
  });

  it('exige sesión', async () => {
    const sinSesion = entorno.nuevoCliente();

    expect((await sinSesion.get('/api/feriados?anio=2026')).estado).toBe(401);
  });
});

describe('asuetos', () => {
  it('el propietario de la cuenta no puede agregar ni quitar asuetos', async () => {
    const agregar = await cuenta.propietario.post('/api/feriados', { fecha: '2026-10-07', nombre: 'Duelo' });
    const quitar = await cuenta.propietario.delete(`/api/feriados/${crypto.randomUUID()}`);

    expect(agregar.estado).toBe(403);
    expect(quitar.estado).toBe(403);
  });

  it('soporte agrega un asueto, todos lo ven y luego lo quita', async () => {
    const creado = await entorno.soporte.post('/api/feriados', { fecha: '2026-09-14', nombre: 'Asueto de la SAT' });
    const visto = await cuenta.propietario.get('/api/feriados?anio=2026');
    const quitado = await entorno.soporte.delete(`/api/feriados/${creado.cuerpo.id}`);
    const despues = await cuenta.propietario.get('/api/feriados?anio=2026');

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo).toMatchObject({ fecha: '2026-09-14', origen: 'asueto_sat' });
    expect(visto.cuerpo.find((f: Feriado) => f.fecha === '2026-09-14')).toMatchObject({ id: creado.cuerpo.id });
    expect(quitado.estado).toBe(204);
    expect(despues.cuerpo.some((f: Feriado) => f.fecha === '2026-09-14')).toBe(false);
  });

  it('no permite dos asuetos en la misma fecha', async () => {
    const primero = await entorno.soporte.post('/api/feriados', { fecha: '2026-08-10', nombre: 'Uno' });
    const repetido = await entorno.soporte.post('/api/feriados', { fecha: '2026-08-10', nombre: 'Dos' });

    expect(repetido.estado).toBe(409);
    await entorno.soporte.delete(`/api/feriados/${primero.cuerpo.id}`);
  });

  it('rechaza fechas inválidas y asuetos que no existen', async () => {
    const invalida = await entorno.soporte.post('/api/feriados', { fecha: '2026-02-30', nombre: 'X' });
    const inexistente = await entorno.soporte.delete(`/api/feriados/${crypto.randomUUID()}`);

    expect(invalida.estado).toBe(400);
    expect(inexistente.estado).toBe(404);
  });

  it('quitar un asueto deja rastro en la auditoría', async () => {
    const creado = await entorno.soporte.post('/api/feriados', { fecha: '2026-07-20', nombre: 'Prueba' });
    await entorno.soporte.delete(`/api/feriados/${creado.cuerpo.id}`);

    const auditado = await auditoriaDe(creado.cuerpo.id);

    expect(auditado).toEqual([
      { recurso: 'core.feriados', accion: 'eliminar', anterior: expect.objectContaining({ fecha: '2026-07-20' }) },
    ]);
  });
});
