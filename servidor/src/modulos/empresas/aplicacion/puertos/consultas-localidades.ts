import type { LocalidadDto, SolicitudDeLocalidad } from '../dto/localidad.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasLocalidades {
  listar(): Promise<LocalidadDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(localidadId: string): Promise<LocalidadDto>;
  /** @throws RecursoNoEncontrado si algo que se eligió no existe o es ajeno. */
  exigirReferencias(solicitud: SolicitudDeLocalidad): Promise<void>;
}
