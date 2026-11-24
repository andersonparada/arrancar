import type { DatosDeTipoDeParcela } from '../dominio/tipo-de-parcela.js';
import type { SolicitudDeTipoDeParcela } from './dto/tipo-de-parcela.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeTipoDeParcela(solicitud: SolicitudDeTipoDeParcela): DatosDeTipoDeParcela {
  return { ...solicitud };
}
