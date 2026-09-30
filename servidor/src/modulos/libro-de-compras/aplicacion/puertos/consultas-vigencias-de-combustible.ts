import type { VigenciaDeCombustibleDto, SolicitudDeVigenciaDeCombustible } from '../dto/vigencia-de-combustible.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasVigenciasDeCombustible {
  listar(): Promise<VigenciaDeCombustibleDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(vigenciaDeCombustibleId: string): Promise<VigenciaDeCombustibleDto>;
  /** @throws RecursoNoEncontrado si algo que se eligió no existe o es ajeno. */
  exigirReferencias(solicitud: SolicitudDeVigenciaDeCombustible): Promise<void>;
}
