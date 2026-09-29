import type { AsignacionesDelUsuario } from '../../core/identidad/aplicacion/permisos-efectivos.js';

export const PERMISO_VER_TODAS_LAS_LOCALIDADES = 'empresas.localidades.ver-todas';

/** Un usuario ve todas las localidades con un rol de acceso total o con el permiso `ver-todas` (de rol o directo). */
export function veTodasLasLocalidades({ roles, directos }: AsignacionesDelUsuario): boolean {
  const dePermiso = (permisos: readonly string[]) => permisos.includes(PERMISO_VER_TODAS_LAS_LOCALIDADES);
  return dePermiso(directos) || roles.some((rol) => rol.accesoTotal || dePermiso(rol.permisos));
}
