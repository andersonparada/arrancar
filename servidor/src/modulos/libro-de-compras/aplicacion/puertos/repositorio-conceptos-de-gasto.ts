import type { ConceptoDeGasto, ConceptoDeGastoId } from '../../dominio/concepto-de-gasto.js';

/** Guarda y recupera los conceptos de gasto para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioConceptosDeGasto {
  buscar(id: ConceptoDeGastoId): Promise<ConceptoDeGasto | null>;
  agregar(conceptoDeGasto: ConceptoDeGasto): Promise<void>;
  guardar(conceptoDeGasto: ConceptoDeGasto): Promise<void>;
  /** ¿La empresa ya tiene algún concepto de gasto? Sin ninguno, le toca la semilla. */
  hayAlguno(): Promise<boolean>;
  /** Agrega los sugeridos; si ya existe uno con ese nombre, lo respeta. */
  sembrar(conceptos: readonly ConceptoDeGasto[]): Promise<void>;
}
