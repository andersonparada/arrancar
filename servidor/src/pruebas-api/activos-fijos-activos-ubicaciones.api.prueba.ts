/**
 * Activos (AF-2): los nombres de las localidades y los departamentos se ven aunque el usuario no tenga acceso a ellas
 * en Empresas (AF-P22 b, para revisión de seguridad), y cada acción de los activos exige su permiso.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe, crearUbicaciones, datosDeActivo, edicionDeActivo } from './soporte/escenario-de-activos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/activos-fijos/activos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let claseId: string;
let localidadId: string;
let departamentoId: string;

const datos = (cambios: Record<string, unknown> = {}) => datosDeActivo(claseId, cambios);
const edicion = (cambios: Record<string, unknown> = {}) => edicionDeActivo(claseId, cambios);

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Ubicaciones', usuario: 'propietarioubicaciones', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Ubicaciones ajena',
    usuario: 'propietarioubicajena',
    modulos,
  });
  claseId = await claseDe(cuenta, 'Vehículos');
  ({ localidadId, departamentoId } = await crearUbicaciones(cuenta));
  await cuenta.propietario.post(RUTA, datos({ localidadId, departamentoId }));
});

describe('nombres de localidades sin acceso a ellas (AF-P22 b)', () => {
  let lector: ClienteApi;

  beforeAll(async () => {
    lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector',
      apellidos: 'Activos',
      permisos: ['activos-fijos.activos.ver', 'empresas.localidades.ver'],
    });
  });

  it('quien no tiene la localidad en Empresas igual ve su nombre en la lista, la ficha y los selectores', async () => {
    const enEmpresas = await lector.get('/api/empresas/localidades');
    const lista = await lector.get(`${RUTA}?texto=Tractor`);
    const ubicaciones = await lector.get('/api/activos-fijos/ubicaciones');

    expect(enEmpresas.cuerpo).toEqual([]);
    const conLocalidad = lista.cuerpo.find((a: { localidadId: string | null }) => a.localidadId === localidadId);
    expect(conLocalidad).toMatchObject({ localidadNombre: 'Finca La Esperanza', departamentoNombre: 'Taller' });
    const ficha = await lector.get(`${RUTA}/${conLocalidad.id}`);
    expect(ficha.cuerpo.traslados[0]).toMatchObject({ localidadNombre: 'Finca La Esperanza' });
    expect(ubicaciones.cuerpo.localidades).toEqual([
      { id: localidadId, codigo: 'FINCA', nombre: 'Finca La Esperanza' },
    ]);
    expect(ubicaciones.cuerpo.departamentos).toEqual([
      { id: departamentoId, codigo: 'TALLER', nombre: 'Taller', localidadId },
    ]);
  });

  it('otra cuenta no ve las localidades de esta en los selectores', async () => {
    expect((await otraCuenta.propietario.get('/api/activos-fijos/ubicaciones')).cuerpo).toEqual({
      localidades: [],
      departamentos: [],
    });
  });
});

describe('permisos por acción', () => {
  it('cada acción exige su permiso', async () => {
    const id = (await cuenta.propietario.post(RUTA, datos({ descripcion: 'Para permisos' }))).cuerpo.id;
    const con = (nombres: string, accion: string) =>
      crearUsuarioConPermisos(entorno, cuenta, {
        nombres,
        apellidos: 'Permisos',
        permisos: ['activos-fijos.activos.ver', `activos-fijos.activos.${accion}`],
      });
    const soloVer = await con('SoloVer', 'ver');
    const creador = await con('Creador', 'crear');
    const editor = await con('Editor', 'editar');
    const eliminador = await con('Eliminador', 'eliminar');

    expect((await soloVer.get(RUTA)).estado).toBe(200);
    expect((await soloVer.post(RUTA, datos())).estado).toBe(403);
    expect((await soloVer.put(`${RUTA}/${id}`, edicion())).estado).toBe(403);
    expect((await soloVer.post(`${RUTA}/${id}/ocioso`, { ocioso: false, fecha: '2026-11-10' })).estado).toBe(403);
    expect((await soloVer.delete(`${RUTA}/${id}`)).estado).toBe(403);
    expect((await creador.post(RUTA, datos())).estado).toBe(201);
    expect((await creador.put(`${RUTA}/${id}`, edicion())).estado).toBe(403);
    expect((await editor.put(`${RUTA}/${id}`, edicion())).estado).toBe(200);
    expect((await editor.delete(`${RUTA}/${id}`)).estado).toBe(403);
    expect((await eliminador.delete(`${RUTA}/${id}`)).estado).toBe(204);
  });

  it('el módulo apagado cierra las rutas', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, {
      nombre: 'Sin activos otra',
      usuario: 'propietariosinactivosotra',
      modulos: [],
    });

    expect((await sinModulo.propietario.get(RUTA)).estado).toBe(403);
  });
});
