import { PermisoDesconocido } from '../dominio/errores.js';
import type { DatosDeRol } from '../dominio/rol.js';
import type { SolicitudDeRol } from './dto/rol.dto.js';
import type { CatalogoDePermisos } from './puertos/catalogo-de-permisos.js';

/**
 * Convierte lo que pidió el usuario en datos del rol.
 * @throws PermisoDesconocido si algún permiso no lo declara ningún módulo.
 */
export function datosDeRol(solicitud: SolicitudDeRol, catalogo: CatalogoDePermisos): DatosDeRol {
  const desconocido = solicitud.permisos.find((permiso) => !catalogo.existe(permiso));
  if (desconocido) throw new PermisoDesconocido(desconocido);
  return { ...solicitud, descripcion: solicitud.descripcion ?? null };
}
