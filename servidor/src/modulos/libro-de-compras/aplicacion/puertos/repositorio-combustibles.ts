import type { Combustible, CombustibleId } from '../../dominio/combustible.js';

/** Guarda y recupera los combustibles para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioCombustibles {
  buscar(id: CombustibleId): Promise<Combustible | null>;
  agregar(combustible: Combustible): Promise<void>;
  guardar(combustible: Combustible): Promise<void>;
}
