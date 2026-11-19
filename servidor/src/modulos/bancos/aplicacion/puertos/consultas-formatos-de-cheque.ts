import type { FormatoDeChequeDto } from '../dto/formato-de-cheque.dto.js';

/** Lecturas para pantallas: datos planos, con cuántas chequeras usan cada formato. */
export interface ConsultasFormatosDeCheque {
  /** Los formatos de la cuenta, por nombre. */
  listar(): Promise<FormatoDeChequeDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la cuenta. */
  obtener(formatoId: string): Promise<FormatoDeChequeDto>;
}
