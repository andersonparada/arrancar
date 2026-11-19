import type { DatosDeInmueble } from '../dominio/inmueble.js';
import type { SolicitudDeInmueble } from './dto/inmueble.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeInmueble(solicitud: SolicitudDeInmueble): DatosDeInmueble {
  return { ...solicitud };
}
