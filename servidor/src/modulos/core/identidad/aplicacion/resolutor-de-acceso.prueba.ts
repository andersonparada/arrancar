import { describe, expect, it } from 'vitest';
import type { EmpresaSesion, UsuarioSesion } from '../../compartido/aplicacion/contexto-de-sesion.js';
import type { PermisosDeRoles } from './puertos/contextos-vecinos.js';
import type { AccesoDelUsuario, CatalogoDeModulos, EmpresasDeLaSesion } from './puertos/empresas-de-la-sesion.js';
import { ResolutorDeAcceso } from './resolutor-de-acceso.js';

const EMPRESA: EmpresaSesion = { id: 'empresa-1', nombre: 'Rancho', cuentaId: 'cuenta-1', cuentaNombre: 'Cuenta' };
const PERMISOS_DISPONIBLES = new Set(['usuarios.ver', 'configuracion.ver', 'configuracion.gestionar']);
const PERMISOS_DE_SUPERACCESO = new Set(['configuracion.ver', 'configuracion.gestionar']);

function usuario(esSuperacceso: boolean): UsuarioSesion {
  return { id: 'usuario-1', usuario: 'u', nombre: 'Usuario', esSuperacceso };
}

/** Un resolutor con doblez de módulo `core` activo y sus permisos, incluidos los de superacceso. */
function crearResolutor(acceso: AccesoDelUsuario | null, permisosDelRol: string[] = []): ResolutorDeAcceso {
  const empresas: EmpresasDeLaSesion = {
    buscar: async () => EMPRESA,
    accesoDe: async () => acceso,
    disponiblesPara: async () => [EMPRESA],
    todas: async () => [EMPRESA],
    modulosContratados: async () => [],
  };
  const modulos: CatalogoDeModulos = {
    activos: () => new Set(['core']),
    permisosDe: () => PERMISOS_DISPONIBLES,
    permisosDeSuperacceso: () => PERMISOS_DE_SUPERACCESO,
    recursosConAlcanceTotal: () => [],
  };
  const roles: PermisosDeRoles = { permisosDelRol: async () => permisosDelRol };
  return new ResolutorDeAcceso({ empresas, modulos, roles });
}

describe('ResolutorDeAcceso', () => {
  it('el propietario (acceso total) no recibe los permisos de configuración', async () => {
    const acceso: AccesoDelUsuario = { rolId: 'rol-1', rolNombre: 'Propietario', accesoTotal: true };
    const resolutor = crearResolutor(acceso);

    const resultado = await resolutor.resolver(usuario(false), EMPRESA.id);

    expect(resultado?.permisos.has('usuarios.ver')).toBe(true);
    expect(resultado?.permisos.has('configuracion.ver')).toBe(false);
    expect(resultado?.permisos.has('configuracion.gestionar')).toBe(false);
  });

  it('el superacceso sí recibe los permisos de configuración', async () => {
    const resolutor = crearResolutor(null);

    const resultado = await resolutor.resolver(usuario(true), EMPRESA.id);

    expect(resultado?.rolNombre).toBe('Superacceso');
    expect(resultado?.permisos.has('configuracion.ver')).toBe(true);
    expect(resultado?.permisos.has('configuracion.gestionar')).toBe(true);
  });

  it('un rol al que le asignaron el permiso a mano igual no lo recibe', async () => {
    const acceso: AccesoDelUsuario = { rolId: 'rol-2', rolNombre: 'Raro', accesoTotal: false };
    const resolutor = crearResolutor(acceso, ['usuarios.ver', 'configuracion.ver']);

    const resultado = await resolutor.resolver(usuario(false), EMPRESA.id);

    expect(resultado?.permisos.has('usuarios.ver')).toBe(true);
    expect(resultado?.permisos.has('configuracion.ver')).toBe(false);
  });
});
