import type { DatosDeConcepto } from '../dominio/concepto.js';
import type { SolicitudDeConcepto } from './dto/concepto.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeConcepto(solicitud: SolicitudDeConcepto): DatosDeConcepto {
  return { ...solicitud };
}
