import type { DatosDeConceptoDeGasto } from '../dominio/concepto-de-gasto.js';
import type { SolicitudDeConceptoDeGasto } from './dto/concepto-de-gasto.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeConceptoDeGasto(solicitud: SolicitudDeConceptoDeGasto): DatosDeConceptoDeGasto {
  return { ...solicitud };
}
