import type { Mejora, MejoraId } from '../../dominio/mejora.js';

/** Guarda y recupera las mejoras y costos posteriores. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioMejoras {
  agregar(mejora: Mejora): Promise<void>;
  buscar(id: MejoraId): Promise<Mejora | null>;
  /** Guarda el cambio de una mejora (anularla). */
  guardar(mejora: Mejora): Promise<void>;
}
