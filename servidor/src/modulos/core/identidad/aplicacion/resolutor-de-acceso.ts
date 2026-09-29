import type { ContextoDeSesion, EmpresaSesion, UsuarioSesion } from '../../compartido/aplicacion/contexto-de-sesion.js';
import type { PermisosDeUsuario } from './puertos/contextos-vecinos.js';
import type { CatalogoDeModulos, EmpresasDeLaSesion } from './puertos/empresas-de-la-sesion.js';
import { permisosEfectivos, type AsignacionesDelUsuario } from './permisos-efectivos.js';

export type AccesoAEmpresaDeSesion = Pick<
  ContextoDeSesion,
  'empresa' | 'roles' | 'modulosActivos' | 'permisos' | 'recursosAlcanceTotal' | 'recursosParaAsignar'
>;

interface Dependencias {
  empresas: EmpresasDeLaSesion;
  modulos: CatalogoDeModulos;
  permisosDeUsuario: PermisosDeUsuario;
}

/** Soporte entra a cualquier empresa como si tuviera un rol con acceso total. */
const ASIGNACIONES_DE_SOPORTE: AsignacionesDelUsuario = {
  roles: [{ rolId: '', nombre: 'Superacceso', accesoTotal: true, permisos: [] }],
  directos: [],
};

/**
 * Con qué roles, módulos y permisos trabaja un usuario en una empresa. Los permisos
 * efectivos son la unión de los de sus roles de la cuenta y sus permisos directos,
 * limitada a los módulos activos (ver `permisosEfectivos`).
 */
export class ResolutorDeAcceso {
  constructor(private readonly dependencias: Dependencias) {}

  /** `null` si la empresa no existe o el usuario no trabaja en ella. */
  async resolver(usuario: UsuarioSesion, empresaId: string): Promise<AccesoAEmpresaDeSesion | null> {
    const empresa = await this.dependencias.empresas.buscar(empresaId);
    const asignaciones = empresa && (await this.asignacionesDe(usuario, empresa));
    if (!empresa || !asignaciones) return null;

    const { modulos, empresas } = this.dependencias;
    const modulosActivos = modulos.activos(await empresas.modulosContratados(empresa.cuentaId));
    const restringidos = usuario.esSuperacceso ? new Set<string>() : modulos.permisosDeSuperacceso(modulosActivos);
    const { permisos, accesoTotal } = permisosEfectivos({
      ...asignaciones,
      disponibles: modulos.permisosDe(modulosActivos),
      restringidos,
    });
    const recursosAlcanceTotal = modulos.recursosConAlcanceTotal(modulosActivos, permisos, accesoTotal);
    const recursosParaAsignar = modulos.recursosParaAsignar(modulosActivos, permisos);
    const nombres = asignaciones.roles.map((rol) => rol.nombre).sort((a, b) => a.localeCompare(b, 'es'));
    return { empresa, roles: nombres, modulosActivos, permisos, recursosAlcanceTotal, recursosParaAsignar };
  }

  /** Los roles y permisos del usuario en la cuenta de la empresa; `null` si no es miembro de ella. */
  private async asignacionesDe(usuario: UsuarioSesion, empresa: EmpresaSesion): Promise<AsignacionesDelUsuario | null> {
    if (usuario.esSuperacceso) return ASIGNACIONES_DE_SOPORTE;
    if (!(await this.dependencias.empresas.esMiembro(usuario.id, empresa.id))) return null;
    return this.dependencias.permisosDeUsuario.enCuenta(usuario.id, empresa.cuentaId);
  }
}
