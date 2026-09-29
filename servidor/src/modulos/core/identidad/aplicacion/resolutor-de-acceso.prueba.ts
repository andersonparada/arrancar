import { describe, expect, it } from 'vitest';
import type { EmpresaSesion, UsuarioSesion } from '../../compartido/aplicacion/contexto-de-sesion.js';
import type { AsignacionesDelUsuario, RolConPermisos } from './permisos-efectivos.js';
import type { PermisosDeUsuario } from './puertos/contextos-vecinos.js';
import type { CatalogoDeModulos, EmpresasDeLaSesion } from './puertos/empresas-de-la-sesion.js';
import { ResolutorDeAcceso } from './resolutor-de-acceso.js';

const EMPRESA: EmpresaSesion = { id: 'empresa-1', nombre: 'Rancho', cuentaId: 'cuenta-1', cuentaNombre: 'Cuenta' };
const PERMISOS_DISPONIBLES = new Set([
  'usuarios.ver',
  'configuracion.ver',
  'configuracion.gestionar',
  'empresas.carga-inicial.reabrir',
]);
const PERMISOS_DE_SUPERACCESO = new Set(['configuracion.ver', 'configuracion.gestionar']);

function usuario(esSuperacceso: boolean): UsuarioSesion {
  return { id: 'usuario-1', usuario: 'u', nombre: 'Usuario', esSuperacceso };
}

function rol(nombre: string, permisos: string[] = [], accesoTotal = false): RolConPermisos {
  return { rolId: `rol-${nombre}`, nombre, accesoTotal, permisos };
}

const PROPIETARIO = rol('Propietario', [], true);

interface Escenario {
  esMiembro?: boolean;
  asignaciones?: AsignacionesDelUsuario;
  /** Lo que devuelve `enCuenta` según la cuenta que se pregunte. */
  consultas?: string[];
}

/** Un resolutor con doble del módulo `core` activo y sus permisos, incluidos los de superacceso. */
function crearResolutor({ esMiembro = true, asignaciones, consultas = [] }: Escenario = {}): ResolutorDeAcceso {
  const empresas: EmpresasDeLaSesion = {
    buscar: async () => EMPRESA,
    esMiembro: async () => esMiembro,
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
  const permisosDeUsuario: PermisosDeUsuario = {
    enCuenta: async (_usuarioId, cuentaId) => {
      consultas.push(cuentaId);
      return asignaciones ?? { roles: [], directos: [] };
    },
  };
  return new ResolutorDeAcceso({ empresas, modulos, permisosDeUsuario });
}

async function resolver(esquema: Escenario, esSuperacceso = false) {
  return crearResolutor(esquema).resolver(usuario(esSuperacceso), EMPRESA.id);
}

describe('ResolutorDeAcceso', () => {
  it('el propietario (acceso total) no recibe los permisos de configuración', async () => {
    const resultado = await resolver({ asignaciones: { roles: [PROPIETARIO], directos: [] } });

    expect(resultado?.permisos.has('usuarios.ver')).toBe(true);
    expect(resultado?.permisos.has('configuracion.ver')).toBe(false);
    expect(resultado?.permisos.has('configuracion.gestionar')).toBe(false);
  });

  it('el superacceso sí recibe los permisos de configuración', async () => {
    const resultado = await resolver({ esMiembro: false }, true);

    expect(resultado?.roles).toEqual(['Superacceso']);
    expect(resultado?.permisos.has('configuracion.ver')).toBe(true);
    expect(resultado?.permisos.has('configuracion.gestionar')).toBe(true);
    expect(resultado?.permisos.has('empresas.carga-inicial.reabrir')).toBe(true);
  });

  it('un rol al que le asignaron el permiso a mano igual no lo recibe', async () => {
    const asignaciones = { roles: [rol('Raro', ['usuarios.ver', 'configuracion.ver'])], directos: [] };

    const resultado = await resolver({ asignaciones });

    expect(resultado?.permisos.has('usuarios.ver')).toBe(true);
    expect(resultado?.permisos.has('configuracion.ver')).toBe(false);
  });

  it('un rol con acceso total recibe todos los permisos asignables', async () => {
    const resultado = await resolver({ asignaciones: { roles: [PROPIETARIO], directos: [] } });

    expect(resultado?.permisos.has('empresas.carga-inicial.reabrir')).toBe(true);
  });

  it('suma los permisos de todos sus roles y los directos, con los nombres de los roles ordenados', async () => {
    const asignaciones = {
      roles: [rol('Contador', ['usuarios.ver']), rol('Bodega', ['empresas.carga-inicial.reabrir'])],
      directos: ['configuracion.ver'],
    };

    const resultado = await resolver({ asignaciones });

    expect(resultado?.roles).toEqual(['Bodega', 'Contador']);
    expect([...(resultado?.permisos ?? [])].sort()).toEqual(['empresas.carga-inicial.reabrir', 'usuarios.ver']);
  });

  it('un permiso directo vale sin ningún rol', async () => {
    const resultado = await resolver({ asignaciones: { roles: [], directos: ['usuarios.ver'] } });

    expect(resultado?.roles).toEqual([]);
    expect([...(resultado?.permisos ?? [])]).toEqual(['usuarios.ver']);
  });

  it('quien no trabaja en la empresa no entra, aunque tenga roles en la cuenta', async () => {
    const asignaciones = { roles: [PROPIETARIO], directos: ['usuarios.ver'] };

    expect(await resolver({ esMiembro: false, asignaciones })).toBeNull();
  });

  it('pide los permisos de la cuenta de la empresa', async () => {
    const consultas: string[] = [];

    await resolver({ consultas });

    expect(consultas).toEqual([EMPRESA.cuentaId]);
  });
});
