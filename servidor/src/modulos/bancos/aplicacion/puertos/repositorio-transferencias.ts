import type { Transferencia, TransferenciaId } from '../../dominio/transferencia.js';

/** Guarda y recupera las transferencias; se anulan, y se eliminan de verdad solo si sus dos notas están limpias. */
export interface RepositorioTransferencias {
  buscar(id: TransferenciaId): Promise<Transferencia | null>;
  agregar(transferencia: Transferencia): Promise<void>;
  guardar(transferencia: Transferencia): Promise<void>;
  eliminar(id: TransferenciaId): Promise<void>;
}
