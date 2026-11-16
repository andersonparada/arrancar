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
  observaciones: string | null;
  /** Solo en la cuenta de apertura: si la carga inicial estaba cerrada al registrarla. */
  conCargaCerrada: boolean | null;
  estado: EstadoDeUnPago;
  /** `AAAA-MM-DD`; solo en un pago anulado. */
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
  lineas: LineaGuardadaDePago[];
}

/** El pago creó su cheque o su nota en Bancos (no solo la ligó): se anula con una orden a Bancos. */
export const creoSuMovimiento = ({ forma }: Pick<PagoConLineas, 'forma'>): boolean =>
  forma === 'cheque' || forma === 'nota_de_debito';
