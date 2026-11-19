import type { AsignacionesDelUsuario } from '../../core/identidad/aplicacion/permisos-efectivos.js';

export const PERMISO_VER_TODAS_LAS_BODEGAS = 'inventarios.bodegas.ver-todas';

/** Un usuario ve todas las bodegas con un rol de acceso total o con el permiso `ver-todas` (de rol o directo). */
export function veTodasLasBodegas({ roles, directos }: AsignacionesDelUsuario): boolean {
  const dePermiso = (permisos: readonly string[]) => permisos.includes(PERMISO_VER_TODAS_LAS_BODEGAS);
  return dePermiso(directos) || roles.some((rol) => rol.accesoTotal || dePermiso(rol.permisos));
}
