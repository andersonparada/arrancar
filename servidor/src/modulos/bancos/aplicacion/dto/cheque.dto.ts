import type { AvisoDeBancos, LineaDeConcepto } from '../../../core/contratos/bancos.contratos.js';
import type { CausaDeAnulacion, EstadoDelCheque } from '../../dominio/cheque.js';
import type { OrigenDeMovimiento } from '../../dominio/origen-de-movimiento.js';
import type { ParteDeApertura } from '../../dominio/partes-de-apertura.js';
import type { MovimientoDto } from './movimiento.dto.js';

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
  /** Por qué se anuló (a mano o por caducidad); `null` si no está anulado. */
  causaDeAnulacion: CausaDeAnulacion | null;
  /** La parte de la carga inicial que es su movimiento (cheque en circulación o posfechado); `null` si se emitió en Arrancar. */
  parteDeApertura: ParteDeApertura | null;
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
  /** El concepto que clasifica el pago; un cheque cuenta como débito. Sin él solo si lo emite otro módulo (`origen`). */
  conceptoId?: string;
  /** Solo lo pasan las órdenes de otro módulo (nunca la API): el origen y el reparto por concepto fijos. */
  origen?: OrigenDeMovimiento;
  conceptos?: LineaDeConcepto[];
}

/** El movimiento del cheque emitido, con los avisos que no bloquean (fondos de un posfechado). */
export type ChequeEmitidoDto = MovimientoDto & { avisos: AvisoDeBancos[] };

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
  /** Por qué se anuló (a mano o por caducidad); `null` si no está anulado. */
  causaDeAnulacion: CausaDeAnulacion | null;
  /** La parte de la carga inicial que es (cheque en circulación o posfechado); `null` si se emitió en Arrancar. */
  parteDeApertura: ParteDeApertura | null;
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
