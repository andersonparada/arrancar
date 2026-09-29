import type { RolConPermisos } from '../permisos-efectivos.js';

/** Lo que un usuario tiene asignado en una cuenta, por identificador. */
export interface AsignacionesPorId {
  rolIds: string[];
  permisos: string[];
}

export interface CambiosDeAsignaciones {
  rolesNuevos: readonly string[];
  rolesQuitados: readonly string[];
  permisosNuevos: readonly string[];
  permisosQuitados: readonly string[];
}

/** Los roles y permisos directos de los usuarios de una cuenta (`usuario_roles`, `usuario_permisos`). */
export interface AsignacionesDeUsuario {
  /** Los roles de la cuenta con sus permisos: id → rol. */
  rolesDeLaCuenta(cuentaId: string): Promise<Map<string, RolConPermisos>>;
  delUsuario(usuarioId: string, cuentaId: string): Promise<AsignacionesPorId>;
  cambiar(persona: { usuarioId: string; cuentaId: string }, cambios: CambiosDeAsignaciones): Promise<void>;
}

/** Los permisos que los módulos declaran y la cuenta puede asignar (nunca los de solo superacceso). */
export interface CatalogoDePermisosAsignables {
  definicionDe(clave: string): DefinicionAsignable | undefined;
  todos(): DefinicionAsignable[];
}

export interface DefinicionAsignable {
  clave: string;
  descripcion: string;
  modulo: string;
}
