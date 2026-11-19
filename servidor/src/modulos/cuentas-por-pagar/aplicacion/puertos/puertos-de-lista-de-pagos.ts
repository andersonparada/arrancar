import type { EstadoDeUnPago, FormaDePago } from '../../dominio/pagos.js';

/** Los filtros de la lista de pagos; todos opcionales salvo la página. */
export interface FiltroDeListaDePagos {
  proveedorId?: string;
  /** Los pagos que tienen una línea en esa contraseña. */
  contrasenaId?: string;
  /** Los pagos en efectivo de ese retiro. */
  retiroId?: string;
  forma?: FormaDePago;
  /** `vigente` por omisión. */
  estado: EstadoDeUnPago | 'todos';
  /** `true`: solo los vigentes con fecha posterior a hoy; `false`: todos los demás. */
  posfechado?: boolean;
  /** Fecha del pago, `AAAA-MM-DD`, incluidas. */
  desde?: string;
  hasta?: string;
  /** La cuenta del cheque o de la nota del pago. */
  cuentaBancariaId?: string;
  pagina: number;
  limite: number;
}

/** Una fila de la lista; el dinero va en centavos. */
export interface FilaDeListaDePagos {
  id: string;
  numero: number;
  anioDeNumero: number;
  proveedor: { id: string; nombre: string; nit: string | null };
  contrasenas: Array<{ id: string; numero: number; anioDeNumero: number }>;
  forma: FormaDePago;
  fecha: string;
  /** Desde cuándo rebaja la deuda: la fecha, o el fin del mes de su conciliación autorizada si fue antes. */
  fechaDeEfecto?: string;
  montoCentavos: number;
  estado: EstadoDeUnPago;
  fechaDeAnulacion: string | null;
  /** El cheque o la nota de Bancos del pago, si tiene. */
  movimiento: { cuentaBancariaId: string; cuentaBancariaNombre: string; numero: number | null } | null;
  /** El retiro de que sale el efectivo, si es en efectivo. */
  retiro: { id: string; numero: number; anioDeNumero: number; custodio: string } | null;
}

export interface PaginaDeListaDePagos {
  filas: FilaDeListaDePagos[];
  total: number;
}

/** La lista de pagos de la empresa (lectura). `hoy` fija qué pagos están posfechados. */
export interface ListaDePagos {
  listar(filtro: FiltroDeListaDePagos, hoy: string): Promise<PaginaDeListaDePagos>;
}

/** Lo de un pago que no trae el pago con sus líneas: quién lo registró y cuándo, y los datos propios de su forma. */
export interface ExtrasDelPago {
  referencia: string | null;
  /** Solo en efectivo: quien recibió por el proveedor. */
  recibidoPor: string | null;
  motivoSinBancarizar: string | null;
  retiro: { id: string; numero: number; anioDeNumero: number; custodio: string; estado: string } | null;
  creadoPorNombre: string | null;
  /** Instante en ISO (UTC). */
  creadoEn: string;
}

export interface ExtrasDeLosPagos {
  /** `null` si el pago no existe en la empresa. */
  extrasDe(pagoId: string): Promise<ExtrasDelPago | null>;
}
