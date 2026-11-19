import type { CausaDeAnulacion, EstadoDelCheque } from '../../dominio/cheque.js';
import type { ReporteDeCorrelativosDeChequesDto } from '../dto/correlativos-de-cheques.dto.js';

/** Un cheque de la chequera con lo que el reporte necesita de él y de su movimiento. */
export interface ChequeDelCorrelativo {
  id: string;
  numero: number;
  estado: EstadoDelCheque;
  causa: CausaDeAnulacion | null;
  impresoEn: Date | null;
  motivoDeAnulacion: string | null;
  movimiento: { fecha: string; beneficiario: string | null; montoCentavos: number } | null;
}

/** Lecturas del reporte de correlativos de cheques de una chequera. */
export interface ConsultasDeCorrelativosDeCheques {
  /** La chequera con su cuenta; `null` si no existe o no es de la empresa. */
  chequera(chequeraId: string): Promise<Pick<ReporteDeCorrelativosDeChequesDto, 'chequera' | 'cuenta'> | null>;
  /** Todos los cheques que tiene la chequera, por número. */
  cheques(chequeraId: string): Promise<ChequeDelCorrelativo[]>;
  /** A qué número pasó el pago de cada cheque inutilizado, según la auditoría `inutilizar`. */
  adondePasaron(chequeIds: readonly string[]): Promise<Map<string, number>>;
}
