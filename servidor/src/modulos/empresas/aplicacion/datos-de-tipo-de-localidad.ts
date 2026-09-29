import type { DatosDeTipoDeLocalidad } from '../dominio/tipo-de-localidad.js';
import type { SolicitudDeTipoDeLocalidad } from './dto/tipo-de-localidad.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeTipoDeLocalidad(solicitud: SolicitudDeTipoDeLocalidad): DatosDeTipoDeLocalidad {
  return { ...solicitud };
}
