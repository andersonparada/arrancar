import type { InmuebleDto, SolicitudDeInmueble } from '../dto/inmueble.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasInmuebles {
  listar(): Promise<InmuebleDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(inmuebleId: string): Promise<InmuebleDto>;
  /** @throws RecursoNoEncontrado si algo que se eligió no existe o es ajeno. */
  exigirReferencias(solicitud: SolicitudDeInmueble): Promise<void>;
}
