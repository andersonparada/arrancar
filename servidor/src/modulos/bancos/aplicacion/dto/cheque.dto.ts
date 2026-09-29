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
  /** Lo calcula el servidor (ver `accionesDeCheque`): si se puede anular. */
  puedeAnular: boolean;
  /** Lo calcula el servidor: si se puede blanquear (emitido, con movimiento limpio). */
  puedeBlanquear: boolean;
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

/**
 * Un cheque emitido o anulado en la lista de la empresa (los disponibles no
 * aparecen aquí: se ven en su chequera). Trae los datos de su movimiento si
 * llegó a emitirse.
 */
export interface ChequeListadoDto {
  id: string;
  numero: number;
  serie: string | null;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  estado: Exclude<EstadoDelCheque, 'disponible'>;
  noNegociable: boolean;
  /** La fecha del movimiento; si nunca se emitió, la de su anulación. */
  fecha: string;
  monto: string | null;
  beneficiario: string | null;
  referencia: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  puedeAnular: boolean;
  puedeBlanquear: boolean;
}

/** Qué cheques listar: emitidos o anulados de una cuenta, entre dos fechas; lo que falte no filtra. */
export interface FiltroDeChequesDeLaEmpresa {
  cuentaBancariaId?: string;
  estado?: Exclude<EstadoDelCheque, 'disponible'>;
  desde?: string;
  hasta?: string;
}
