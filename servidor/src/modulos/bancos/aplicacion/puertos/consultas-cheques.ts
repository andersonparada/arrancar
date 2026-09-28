import type { ChequeDto, ChequeListadoDto, FiltroDeChequesDeLaEmpresa } from '../dto/cheque.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasCheques {
  /** Los cheques de una chequera, opcionalmente filtrados por estado, por número. */
  listarDeLaChequera(chequeraId: string, estado?: 'disponible' | 'emitido' | 'anulado'): Promise<ChequeDto[]>;
  /** Los cheques emitidos o anulados de la empresa, más recientes primero; los disponibles no se listan aquí. */
  listarDeLaEmpresa(filtro: FiltroDeChequesDeLaEmpresa): Promise<ChequeListadoDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(chequeId: string): Promise<ChequeDto>;
  /** El menor número disponible entre las chequeras activas de la cuenta; `null` si no hay ninguno. */
  siguienteDisponible(cuentaBancariaId: string): Promise<ChequeDto | null>;
}
