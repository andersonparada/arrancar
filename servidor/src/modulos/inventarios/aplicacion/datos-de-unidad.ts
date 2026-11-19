import type { DatosDeUnidad } from '../dominio/unidad.js';
import type { SolicitudDeUnidad } from './dto/unidad.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeUnidad(solicitud: SolicitudDeUnidad): DatosDeUnidad {
  return { ...solicitud };
}
