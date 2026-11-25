import type { DatosDeConceptoDeIngreso } from '../dominio/concepto-de-ingreso.js';
import type { SolicitudDeConceptoDeIngreso } from './dto/concepto-de-ingreso.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeConceptoDeIngreso(solicitud: SolicitudDeConceptoDeIngreso): DatosDeConceptoDeIngreso {
  return { ...solicitud };
}
