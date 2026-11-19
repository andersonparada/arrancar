import type { DatosDeArticulo } from '../dominio/articulo.js';
import type { SolicitudDeArticulo } from './dto/articulo.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeArticulo(solicitud: SolicitudDeArticulo): DatosDeArticulo {
  return { ...solicitud };
}
