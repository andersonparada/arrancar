import type { DatosDeClase } from '../dominio/clase.js';
import type { SolicitudDeClase } from './dto/clase.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeClase(solicitud: SolicitudDeClase): DatosDeClase {
  return { ...solicitud };
}
