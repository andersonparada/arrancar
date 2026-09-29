import type { DatosDeDepartamento } from '../dominio/departamento.js';
import type { SolicitudDeDepartamento } from './dto/departamento.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeDepartamento(solicitud: SolicitudDeDepartamento): DatosDeDepartamento {
  return { ...solicitud };
}
