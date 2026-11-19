import type { Bodega, DatosDeBodega } from '../dominio/bodega.js';
import type { BodegaDto, SolicitudDeBodega } from './dto/bodega.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeBodega(solicitud: SolicitudDeBodega): DatosDeBodega {
  return { ...solicitud };
}

/** La bodega como la ve la pantalla, sin volver a leerla (la localidad se muestra por su id). */
export function dtoDeBodega(bodega: Bodega): BodegaDto {
  const { id, empresaId, ...datos } = bodega.instantanea();
  return { ...datos, id: id.valor, localidadNombre: null };
}
