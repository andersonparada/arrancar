import type { Division, DivisionId } from '../../dominio/division.js';

/** Guarda y recupera las divisiones. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioDivisiones {
  agregar(division: Division): Promise<void>;
  buscar(id: DivisionId): Promise<Division | null>;
  /** Guarda el cambio de una división (anularla). */
  guardar(division: Division): Promise<void>;
  /**
   * Borra las cuotas sin efecto (`vigente = false`, de un mes reabierto) del activo nuevo de una división que se anula,
   * y las devuelve para que queden en la auditoría. Las cuotas vigentes no se tocan: antes se revisó que no hubiera.
   */
  retirarCuotasSinEfecto(activoId: string): Promise<Record<string, unknown>[]>;
}
