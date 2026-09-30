import type { ConceptoDeGasto, ConceptoDeGastoId } from '../../dominio/concepto-de-gasto.js';

/** Guarda y recupera los conceptos de gasto para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioConceptosDeGasto {
  buscar(id: ConceptoDeGastoId): Promise<ConceptoDeGasto | null>;
  agregar(conceptoDeGasto: ConceptoDeGasto): Promise<void>;
  guardar(conceptoDeGasto: ConceptoDeGasto): Promise<void>;
}
