import type { Transferencia, TransferenciaId } from '../../dominio/transferencia.js';

/** Guarda y recupera las transferencias para anularlas; nunca se corrigen ni se borran. */
export interface RepositorioTransferencias {
  buscar(id: TransferenciaId): Promise<Transferencia | null>;
  agregar(transferencia: Transferencia): Promise<void>;
  guardar(transferencia: Transferencia): Promise<void>;
}
