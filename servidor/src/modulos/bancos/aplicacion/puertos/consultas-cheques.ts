import type { ChequeDto } from '../dto/cheque.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasCheques {
  /** Los cheques de una chequera, opcionalmente filtrados por estado, por número. */
  listarDeLaChequera(chequeraId: string, estado?: 'disponible' | 'emitido' | 'anulado'): Promise<ChequeDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(chequeId: string): Promise<ChequeDto>;
  /** El menor número disponible entre las chequeras activas de la cuenta; `null` si no hay ninguno. */
  siguienteDisponible(cuentaBancariaId: string): Promise<ChequeDto | null>;
}
