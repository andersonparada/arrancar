import type { EstadoDeUnPago, FormaDePago } from './pagos.js';

/** Una línea de un pago guardado: lo que entregó a un cargo de una de las contraseñas de su proveedor. */
export interface LineaGuardadaDePago {
  cargoId: string;
  contrasenaId: string;
  montoCentavos: number;
  retencionDescontadaCentavos: number;
}

/** Un pago guardado con todas sus líneas (también las de un pago anulado), para anularlo, reaplicarlo o mostrarlo. */
export interface PagoConLineas {
  id: string;
  proveedorId: string;
  /** Correlativo; con `anioDeNumero` forma el número que ve el usuario (`numeroDelPago`). */
  numero: number;
  anioDeNumero: number;
  forma: FormaDePago;
  /** `AAAA-MM-DD`. */
  fecha: string;
  montoCentavos: number;
  /** El cheque o la nota de Bancos (en la nota ligada, la nota); nulo en la cuenta de apertura y en efectivo. */
  movimientoId: string | null;
  retiroId: string | null;
  /** Solo en efectivo: quien recibió el efectivo por el proveedor. */
  recibidoPor: string | null;
  /** Solo en efectivo: por qué se usó la excepción de bancarización. */
  motivoSinBancarizar: string | null;
  observaciones: string | null;
  /** Solo en la cuenta de apertura: por qué se dio por pagado. */
  motivo: string | null;
  /** Solo en la cuenta de apertura: si la carga inicial estaba cerrada al registrarla. */
  conCargaCerrada: boolean | null;
  /** Solo en la cuenta de apertura y solo informativo: el cheque en circulación de la carga inicial que pagó lo mismo. */
  chequeDeAperturaReferidoId: string | null;
  estado: EstadoDeUnPago;
  /** `AAAA-MM-DD`; solo en un pago anulado. */
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
  lineas: LineaGuardadaDePago[];
}

/**
 * El cheque o la nota de Bancos es del pago (lo creó, o el posfechado de apertura se le ligó con su origen): se anula con
 * una orden a Bancos y su conciliación decide si se puede anular. La nota ligada no: es de varios pagos.
 */
export const creoSuMovimiento = ({ forma }: Pick<PagoConLineas, 'forma'>): boolean =>
  forma === 'cheque' || forma === 'nota_de_debito' || forma === 'cheque_de_apertura';

/** La cuenta de apertura y el cheque de apertura solo cubren saldos iniciales: lo que ya se debía al corte. */
export const esDeLaApertura = ({ forma }: Pick<PagoConLineas, 'forma'>): boolean =>
  forma === 'cuenta_de_apertura' || forma === 'cheque_de_apertura';
