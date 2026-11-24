import type { Division, DivisionId } from '../../dominio/division.js';

/** Guarda y recupera las divisiones. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioDivisiones {
  agregar(division: Division): Promise<void>;
  buscar(id: DivisionId): Promise<Division | null>;
  /** Guarda el cambio de una división (anularla). */
  guardar(division: Division): Promise<void>;
}
