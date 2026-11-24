import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const NIT = '12345679';
const OTRO_NIT = '1000002-K';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let editor: ClienteApi;
let editorId: string;
const empresasDelEditor: string[] = [];

/** El editor solo entra a las empresas que se le dan: se le suma la que acaba de crearse. */
async function darleAccesoAlEditor(empresaId: string): Promise<void> {
  empresasDelEditor.push(empresaId);
  const respuesta = await cuenta.propietario.patch(`/api/usuarios/${editorId}`, {
    empresaIds: [cuenta.empresaId, ...empresasDelEditor],
  });
  expect(respuesta.estado).toBe(204);
}

async function rastros(empresaId: string) {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query(
    "select accion, motivo, anterior from core.auditoria where recurso = 'empresas.empresas' and registro_id = $1 and accion = 'corregir' order by creado_en",
    [empresaId],
  );
  await conexion.end();
  return rows as { accion: string; motivo: string | null; anterior: { nit: string | null; nitNuevo: string | null } }[];
}

async function empresaConNit(): Promise<string> {
  const creada = await cuenta.propietario.post('/api/empresas', { nombre: `Con NIT ${Math.random()}`, nit: NIT });
  await darleAccesoAlEditor(creada.cuerpo.id);
  return creada.cuerpo.id as string;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Nit', usuario: 'propietarionit' });
  editor = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Edita',
    apellidos: 'Sinnit',
    permisos: ['empresas.ver', 'empresas.editar'],
  });
  editorId = (await editor.get('/api/sesion')).cuerpo.usuario.id;
});

describe('cambiar el NIT de una empresa (A-10)', () => {
  it('agregar un NIT a una empresa sin NIT no pide motivo y deja rastro', async () => {
    const sinNit = await cuenta.propietario.post('/api/empresas', { nombre: 'Sin NIT todavía' });

    await darleAccesoAlEditor(sinNit.cuerpo.id);

    const respuesta = await editor.put(`/api/empresas/${sinNit.cuerpo.id}`, { nombre: 'Sin NIT todavía', nit: NIT });

    expect(respuesta.estado).toBe(200);
    const [rastro] = await rastros(sinNit.cuerpo.id);
    expect(rastro?.anterior).toMatchObject({ nit: null, nitNuevo: NIT });
  });

  it('quitarlo sin el permiso se niega (403) y el NIT queda', async () => {
    const id = await empresaConNit();

    const respuesta = await editor.put(`/api/empresas/${id}`, { nombre: 'Con NIT', nit: null, motivoDelNit: 'Error' });

    expect(respuesta.estado).toBe(403);
    expect((await cuenta.propietario.get(`/api/empresas/${id}`)).cuerpo.nit).toBe(NIT);
  });

  it('con el permiso, quitarlo o reemplazarlo sin motivo se niega (400)', async () => {
    const id = await empresaConNit();

    const quitar = await cuenta.propietario.put(`/api/empresas/${id}`, { nombre: 'Con NIT', nit: null });
    const reemplazar = await cuenta.propietario.put(`/api/empresas/${id}`, { nombre: 'Con NIT', nit: OTRO_NIT });

    expect(quitar.estado).toBe(400);
    expect(quitar.cuerpo.error.codigo).toBe('motivo_del_cambio_de_nit_requerido');
    expect(reemplazar.estado).toBe(400);
  });

  it('con permiso y motivo se reemplaza y queda el motivo y el NIT de antes en la auditoría', async () => {
    const id = await empresaConNit();

    const respuesta = await cuenta.propietario.put(`/api/empresas/${id}`, {
      nombre: 'Con NIT',
      nit: OTRO_NIT,
      motivoDelNit: 'Se digitó mal',
    });

    expect(respuesta.estado).toBe(200);
    const [rastro] = await rastros(id);
    expect(rastro).toMatchObject({ motivo: 'Se digitó mal', anterior: { nit: NIT, nitNuevo: '1000002K' } });
  });

  it('editar otros datos con el mismo NIT no pide nada ni deja rastro de NIT', async () => {
    const id = await empresaConNit();

    const respuesta = await editor.put(`/api/empresas/${id}`, { nombre: 'Otro nombre', nit: NIT });

    expect(respuesta.estado).toBe(200);
    expect(await rastros(id)).toEqual([]);
  });

  it('dos ediciones a la vez no deshacen una corrección de NIT sin permiso ni rastro', async () => {
    for (let vuelta = 0; vuelta < 5; vuelta++) {
      const id = await empresaConNit();

      await Promise.all([
        editor.put(`/api/empresas/${id}`, { nombre: 'Otro nombre', nit: NIT }),
        cuenta.propietario.put(`/api/empresas/${id}`, {
          nombre: 'Con NIT',
          nit: OTRO_NIT,
          motivoDelNit: 'Se digitó mal',
        }),
      ]);

      expect((await cuenta.propietario.get(`/api/empresas/${id}`)).cuerpo.nit).toBe('1000002K');
      expect(await rastros(id)).toHaveLength(1);
    }
  });
});
