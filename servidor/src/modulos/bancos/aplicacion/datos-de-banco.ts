import type { DatosDeBanco } from '../dominio/banco.js';
import type { SolicitudDeBanco } from './dto/banco.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeBanco(solicitud: SolicitudDeBanco): DatosDeBanco {
  return { ...solicitud };
}
