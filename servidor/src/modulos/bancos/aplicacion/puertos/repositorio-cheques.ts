import type { Cheque, ChequeId } from '../../dominio/cheque.js';

/** Guarda y recupera los cheques. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioCheques {
  buscar(id: ChequeId): Promise<Cheque | null>;
  /** Inserción masiva y eficiente: hasta el máximo configurado de cheques de una chequera nueva. */
  agregarVarios(cheques: Cheque[]): Promise<void>;
  guardar(cheque: Cheque): Promise<void>;
}
