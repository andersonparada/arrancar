import type { Concepto, ConceptoId } from '../../dominio/concepto.js';

/** Guarda y recupera los conceptos para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioConceptos {
  buscar(id: ConceptoId): Promise<Concepto | null>;
  /** El concepto de sistema de la empresa con esa clave (`transferencia`, `saldo_inicial`…); `null` si aún no existe. */
  buscarDeSistema(clave: string): Promise<Concepto | null>;
  agregar(concepto: Concepto): Promise<void>;
  guardar(concepto: Concepto): Promise<void>;
  eliminar(id: ConceptoId): Promise<void>;
  /** ¿La empresa ya tiene algún concepto? Sin ninguno, le toca la semilla. */
  hayAlguno(): Promise<boolean>;
  /** Agrega los que falten; si ya existe uno con ese nombre o esa clave, lo respeta. */
  sembrar(conceptos: readonly Concepto[]): Promise<void>;
}
