import type { EstadoDeUnPago } from '../../dominio/pagos.js';
import type { EstadoDeRetiro, FormaDeRetiro } from '../../dominio/retiros.js';

/** El cheque o la nota que Bancos creó para el retiro (o para su devolución). `numero` es el del cheque o el de la nota. */
export interface MovimientoDelRetiroDto {
  id: string;
  cuentaBancariaId: string;
  numero: number;
}

/** Un pago en efectivo del retiro. Dinero como texto con dos decimales. */
export interface PagoDelRetiroDto {
  id: string;
  numero: string;
  proveedor: { id: string; nombre: string };
  fecha: string;
  monto: string;
  estado: EstadoDeUnPago;
}

/** Una fila de la lista de retiros. */
export interface RetiroResumenDto {
  id: string;
  numero: string;
  forma: FormaDeRetiro;
  /** El número del cheque o el de la nota de Bancos. */
  documento: number;
  cuentaBancariaId: string;
  fecha: string;
  custodio: string;
  monto: string;
  pagado: string;
  /** Al corte si se pidió; si no, lo que queda por usar hoy. */
  disponible: string;
  estado: EstadoDeRetiro;
  /** Abierto y de un mes anterior al de hoy. */
  deMesAnterior: boolean;
  /** El aviso de fin de mes, si `deMesAnterior`. */
  aviso: string | null;
}

export interface PaginaDeRetirosDto {
  elementos: RetiroResumenDto[];
  total: number;
  /** La suma del disponible de todo lo filtrado. */
  totalDisponible: string;
}

/** El retiro completo, con sus pagos y los avisos que no bloquean (los suyos y los de Bancos al registrarlo). */
export interface RetiroDto {
  id: string;
  numero: string;
  forma: FormaDeRetiro;
  fecha: string;
  monto: string;
  movimiento: MovimientoDelRetiroDto;
  custodio: string;
  custodioUsuarioId: string | null;
  observaciones: string | null;
  estado: EstadoDeRetiro;
  pagado: string;
  disponible: string;
  devuelto: string;
  faltante: string;
  motivoDeFaltante: string | null;
  /** Solo en un retiro liquidado: cuándo y con qué depósito. */
  liquidacion: { fecha: string; deposito: MovimientoDelRetiroDto | null } | null;
  /** Solo en un retiro anulado: la fecha contable y el motivo. */
  anulacion: { fecha: string; motivo: string } | null;
  pagos: PagoDelRetiroDto[];
  deMesAnterior: boolean;
  puedeAnular: boolean;
  puedeLiquidar: boolean;
  puedeReabrir: boolean;
  /** Quien lo lee es el custodio: si lo liquida, la ventana avisa que conviene que lo haga otra persona. */
  liquidaElCustodio: boolean;
  avisos: string[];
}
