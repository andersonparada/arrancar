import type { ConceptoDeGastoDto } from '../dto/concepto-de-gasto.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasConceptosDeGasto {
  listar(): Promise<ConceptoDeGastoDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(conceptoDeGastoId: string): Promise<ConceptoDeGastoDto>;
}
