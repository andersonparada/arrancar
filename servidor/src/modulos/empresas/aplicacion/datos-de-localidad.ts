import type { DatosDeLocalidad, Localidad } from '../dominio/localidad.js';
import type { LocalidadDto, SolicitudDeLocalidad } from './dto/localidad.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeLocalidad(solicitud: SolicitudDeLocalidad): DatosDeLocalidad {
  return { ...solicitud };
}

/** La localidad como la ve la pantalla, sin volver a leerla (el tipo se muestra por su id). */
export function dtoDeLocalidad(localidad: Localidad): LocalidadDto {
  const { id, empresaId, ...datos } = localidad.instantanea();
  return { ...datos, id: id.valor, tipoNombre: null };
}
