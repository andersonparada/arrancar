import type { DatosDeCategoria } from '../dominio/categoria.js';
import type { SolicitudDeCategoria } from './dto/categoria.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeCategoria(solicitud: SolicitudDeCategoria): DatosDeCategoria {
  return { ...solicitud };
}
