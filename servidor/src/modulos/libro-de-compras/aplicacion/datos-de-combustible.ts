import type { DatosDeCombustible } from '../dominio/combustible.js';
import type { SolicitudDeCombustible } from './dto/combustible.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeCombustible(solicitud: SolicitudDeCombustible): DatosDeCombustible {
  return { ...solicitud };
}
