import type { ContextoDeSesion, UsuarioSesion } from '../../compartido/aplicacion/contexto-de-sesion.js';
import type { CatalogoDeModulos, EmpresasDeLaSesion } from './puertos/empresas-de-la-sesion.js';
import type { PermisosDeRoles } from './puertos/contextos-vecinos.js';

export type AccesoAEmpresaDeSesion = Pick<
  ContextoDeSesion,
  'empresa' | 'rolNombre' | 'modulosActivos' | 'permisos' | 'recursosAlcanceTotal'
>;

interface Dependencias {
  empresas: EmpresasDeLaSesion;
  modulos: CatalogoDeModulos;
  roles: PermisosDeRoles;
}

interface Rol {
  nombre: string;
  accesoTotal: boolean;
  permisos: readonly string[];
}

/** Soporte entra a cualquier empresa como si tuviera un rol con acceso total. */
const ROL_DE_SOPORTE: Rol = { nombre: 'Superacceso', accesoTotal: true, permisos: [] };

/**
 * Con qué rol, módulos y permisos trabaja un usuario en una empresa. Los permisos
 * efectivos son los del rol limitados a los módulos activos de la cuenta.
 */
export class ResolutorDeAcceso {
  constructor(private readonly dependencias: Dependencias) {}

  /** `null` si la empresa no existe o el usuario no trabaja en ella. */
  async resolver(usuario: UsuarioSesion, empresaId: string): Promise<AccesoAEmpresaDeSesion | null> {
    const empresa = await this.dependencias.empresas.buscar(empresaId);
    const rol = empresa && (await this.rolDe(usuario, empresaId));
    if (!empresa || !rol) return null;

    const { modulos } = this.dependencias;
    const modulosActivos = modulos.activos(await this.dependencias.empresas.modulosContratados(empresa.cuentaId));
    const disponibles = modulos.permisosDe(modulosActivos);
    const permisos = rol.accesoTotal ? disponibles : new Set(rol.permisos.filter((p) => disponibles.has(p)));
    const recursosAlcanceTotal = modulos.recursosConAlcanceTotal(modulosActivos, permisos, rol.accesoTotal);
    return { empresa, rolNombre: rol.nombre, modulosActivos, permisos, recursosAlcanceTotal };
  }

  private async rolDe(usuario: UsuarioSesion, empresaId: string): Promise<Rol | null> {
    if (usuario.esSuperacceso) return ROL_DE_SOPORTE;
    const acceso = await this.dependencias.empresas.accesoDe(usuario.id, empresaId);
    if (!acceso) return null;
    const permisos = acceso.accesoTotal ? [] : await this.dependencias.roles.permisosDelRol(acceso.rolId);
    return { nombre: acceso.rolNombre, accesoTotal: acceso.accesoTotal, permisos };
  }
}
