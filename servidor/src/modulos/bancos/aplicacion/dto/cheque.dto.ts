import type { EstadoDelCheque } from '../../dominio/cheque.js';

/** Cheque tal como lo ve el usuario en pantalla. */
export interface ChequeDto {
  id: string;
  chequeraId: string;
  numero: number;
  estado: EstadoDelCheque;
  noNegociable: boolean;
  movimientoId: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que se recibe para emitir un cheque, ya validado en su forma. */
export interface SolicitudDeEmisionDeCheque {
  chequeId: string;
  fecha: string;
  monto: string;
  beneficiario: string;
  noNegociable: boolean;
  referencia: string | null;
  observaciones: string | null;
}
