import type { ConceptoDto } from '../dto/concepto.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasConceptos {
  listar(): Promise<ConceptoDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(conceptoId: string): Promise<ConceptoDto>;
  /** ¿Alguna nota o cheque de la empresa usa este concepto? */
  estaEnUso(conceptoId: string): Promise<boolean>;
}
