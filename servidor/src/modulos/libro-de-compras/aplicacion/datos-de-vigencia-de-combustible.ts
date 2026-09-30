import type { DatosDeVigenciaDeCombustible } from '../dominio/vigencia-de-combustible.js';
import type { SolicitudDeVigenciaDeCombustible } from './dto/vigencia-de-combustible.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeVigenciaDeCombustible(
  solicitud: SolicitudDeVigenciaDeCombustible,
): DatosDeVigenciaDeCombustible {
  return { ...solicitud };
}
