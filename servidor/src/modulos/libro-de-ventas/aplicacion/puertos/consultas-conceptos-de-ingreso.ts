import type { ConceptoDeIngresoDto } from '../dto/concepto-de-ingreso.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasConceptosDeIngreso {
  listar(): Promise<ConceptoDeIngresoDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(conceptoDeIngresoId: string): Promise<ConceptoDeIngresoDto>;
}
