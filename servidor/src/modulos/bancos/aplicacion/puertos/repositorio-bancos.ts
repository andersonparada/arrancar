import type { Banco, BancoId } from '../../dominio/banco.js';

/** Guarda y recupera los bancos para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioBancos {
  buscar(id: BancoId): Promise<Banco | null>;
  agregar(banco: Banco): Promise<void>;
  guardar(banco: Banco): Promise<void>;
}
