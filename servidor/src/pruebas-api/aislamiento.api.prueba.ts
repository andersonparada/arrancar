import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearImagenPng } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
let familiaA: CuentaDePrueba;
let familiaB: CuentaDePrueba;
const deLaFamiliaA = { terceroId: '', archivoId: '', rolId: '', usuarioId: '' };

function ids(lista: { id: string }[]): string[] {
  return lista.map((elemento) => elemento.id);
}

beforeAll(async () => {
  familiaA = await darDeAltaCuenta(entorno, { nombre: 'Familia A', usuario: 'familiaa', modulos: ['terceros'] });
  familiaB = await darDeAltaCuenta(entorno, { nombre: 'Familia B', usuario: 'familiab', modulos: ['terceros'] });

  const tercero = await familiaA.propietario.post('/api/terceros', {
    tipo: 'individual',
    nombres: 'Secreto',
    apellidos: 'De A',
  });
  const archivo = await familiaA.propietario.subirImagen('POST', '/api/archivos', await crearImagenPng());
  const roles = await familiaA.propietario.get('/api/roles');
  const usuarios = await familiaA.propietario.get('/api/usuarios');
  Object.assign(deLaFamiliaA, {
    terceroId: tercero.cuerpo.id,
    archivoId: archivo.cuerpo.id,
    rolId: roles.cuerpo[0].id,
    usuarioId: usuarios.cuerpo[0].id,
  });
});

describe('una cuenta nunca ve ni toca los datos de otra', () => {
  it('los listados solo muestran lo propio', async () => {
    const [terceros, roles, usuarios, empresas] = await Promise.all([
      familiaB.propietario.get('/api/terceros'),
      familiaB.propietario.get('/api/roles'),
      familiaB.propietario.get('/api/usuarios'),
      familiaB.propietario.get('/api/empresas'),
    ]);

    expect(ids(terceros.cuerpo)).not.toContain(deLaFamiliaA.terceroId);
    expect(ids(roles.cuerpo)).not.toContain(deLaFamiliaA.rolId);
    expect(ids(usuarios.cuerpo)).not.toContain(deLaFamiliaA.usuarioId);
    expect(ids(empresas.cuerpo)).toEqual([familiaB.empresaId]);
  });

  it('pedir por id un registro de otra cuenta responde como si no existiera', async () => {
    const tercero = await familiaB.propietario.get(`/api/terceros/${deLaFamiliaA.terceroId}`);
    const archivo = await familiaB.propietario.get(`/api/archivos/${deLaFamiliaA.archivoId}`);
    const empresa = await familiaB.propietario.get(`/api/empresas/${familiaA.empresaId}`);

    expect(tercero.estado).toBe(404);
    expect(archivo.estado).toBe(404);
    expect(empresa.estado).toBe(404);
  });

  it('no puede modificar ni eliminar registros de otra cuenta', async () => {
    const tercero = await familiaB.propietario.put(`/api/terceros/${deLaFamiliaA.terceroId}`, {
      tipo: 'individual',
      nombres: 'Robado',
    });
    const rol = await familiaB.propietario.delete(`/api/roles/${deLaFamiliaA.rolId}`);
    const usuario = await familiaB.propietario.patch(`/api/usuarios/${deLaFamiliaA.usuarioId}`, { activo: false });

    expect(tercero.estado).toBe(404);
    expect(rol.estado).toBe(404);
    expect(usuario.estado).toBe(404);
  });

  it('no puede asignar a sus usuarios empresas de otra cuenta', async () => {
    const roles = await familiaB.propietario.get('/api/roles');

    const respuesta = await familiaB.propietario.post('/api/usuarios', {
      nombres: 'Intruso',
      apellidos: 'Prueba',
      contrasena: 'contrasena-de-prueba',
      empresaIds: [familiaA.empresaId],
      rolIds: [roles.cuerpo[0].id],
    });

    expect(respuesta.estado).toBe(400);
  });
});
