import type { ChequeEnCirculacionDto } from '../dto/cheque-en-circulacion.dto.js';

/** Un cheque en circulación tal como sale de la base: sin los datos que calcula el caso de uso. */
export type ChequeEnCirculacionCrudo = Omit<ChequeEnCirculacionDto, 'diasDeAntiguedad' | 'origen'>;

export interface CondicionesDeCirculacion {
  /** Solo los cheques con fecha anterior a esta. */
  fechaDeCorte: string;
  cuentaBancariaId?: string;
  beneficiario?: string;
}

/** Lectura de los cheques emitidos, sin cobrar, sin revertir y sin anular; se llama dentro de la unidad de trabajo. */
export interface ConsultasDeChequesEnCirculacion {
  /** Del más antiguo al más reciente. */
  listar(condiciones: CondicionesDeCirculacion): Promise<ChequeEnCirculacionCrudo[]>;
}
