import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Barrios', usuario: 'ebarrios' });
});

describe('roles', () => {
  it('la cuenta nace con el rol Propietario de acceso total', async () => {
    const respuesta = await cuenta.propietario.get('/api/roles');

    expect(respuesta.cuerpo).toEqual([expect.objectContaining({ nombre: 'Propietario', accesoTotal: true })]);
  });

  it('crea, cambia y elimina un rol', async () => {
    const creado = await cuenta.propietario.post('/api/roles', { nombre: 'Encargado', permisos: ['usuarios.ver'] });
    const cambiado = await cuenta.propietario.put(`/api/roles/${creado.cuerpo.id}`, {
      nombre: 'Encargado de finca',
      permisos: ['usuarios.ver', 'roles.ver'],
    });
    const eliminado = await cuenta.propietario.delete(`/api/roles/${creado.cuerpo.id}`);

    expect(creado.estado).toBe(201);
    expect(cambiado.estado).toBe(204);
    expect(eliminado.estado).toBe(204);
  });

  it('no permite dos roles con el mismo nombre', async () => {
    await cuenta.propietario.post('/api/roles', { nombre: 'Contador' });

    const repetido = await cuenta.propietario.post('/api/roles', { nombre: 'Contador' });

    expect(repetido.estado).toBe(409);
  });

  it('rechaza permisos que no existen', async () => {
    const respuesta = await cuenta.propietario.post('/api/roles', { nombre: 'Raro', permisos: ['inventado.hacer'] });

    expect(respuesta.estado).toBe(400);
  });

  it('no permite quedarse sin un rol de acceso total', async () => {
    const roles = await cuenta.propietario.get('/api/roles');
    const propietario = roles.cuerpo.find((r: { nombre: string }) => r.nombre === 'Propietario');

    const respuesta = await cuenta.propietario.put(`/api/roles/${propietario.id}`, {
      nombre: 'Propietario',
      accesoTotal: false,
    });

    expect(respuesta.estado).toBe(422);
  });

  it('no permite eliminar un rol asignado a usuarios', async () => {
    const roles = await cuenta.propietario.get('/api/roles');
    const propietario = roles.cuerpo.find((r: { nombre: string }) => r.nombre === 'Propietario');

    const respuesta = await cuenta.propietario.delete(`/api/roles/${propietario.id}`);

    expect(respuesta.estado).toBe(422);
  });
});

describe('catálogo de permisos', () => {
  it('solo ofrece permisos de los módulos activos de la cuenta', async () => {
    const antes = await cuenta.propietario.get('/api/permisos');
    await entorno.soporte.put(`/api/plataforma/cuentas/${cuenta.cuentaId}/modulos/terceros`);
    const despues = await cuenta.propietario.get('/api/permisos');

    const modulos = (grupos: { modulo: string }[]) => grupos.map((g) => g.modulo);
    expect(modulos(antes.cuerpo)).not.toContain('terceros');
    expect(modulos(despues.cuerpo)).toContain('terceros');
  });
});

describe('permisos por acción', () => {
  it('un usuario solo con permiso de ver no puede crear', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector',
      apellidos: 'Usuarios',
      permisos: ['usuarios.ver'],
    });

    const ver = await lector.get('/api/usuarios');
    const crear = await lector.post('/api/roles', { nombre: 'Intento' });

    expect(ver.estado).toBe(200);
    expect(crear.estado).toBe(403);
  });

  it('la sesión informa solo los permisos del rol', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Roles',
      permisos: ['roles.ver'],
    });

    const sesion = await lector.get('/api/sesion');

    expect(sesion.cuerpo.permisos).toEqual(['roles.ver']);
  });
});
