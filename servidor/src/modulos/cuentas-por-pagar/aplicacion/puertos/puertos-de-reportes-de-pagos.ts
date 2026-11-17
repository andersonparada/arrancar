import type { FormaDePago } from '../../dominio/pagos.js';
import type { PaginacionDeDocumentos } from './puertos-de-consultas.js';

/** Qué pagos entran en R6 según su estado. */
export type EstadoPedidoDePagos = 'vigentes' | 'anulados' | 'todos';

/** Los filtros de R6 ya con sus omisiones. `desde` y `hasta` son inclusivos (`AAAA-MM-DD`). */
export interface FiltroDePagosRealizados {
  empresaId: string;
  desde: string;
  hasta: string;
  proveedorId?: string;
  forma?: FormaDePago;
  cuentaBancariaId?: string;
  estado: EstadoPedidoDePagos;
  /** Solo los pagos con fecha posterior al día en que se registraron. */
  posfechados: boolean;
  /** Solo las líneas cuyo documento registró o autorizó quien registró el pago. */
  mismaPersona: boolean;
}

/** Una línea de un pago: lo que entregó a un cargo. El dinero va como texto de dos decimales. */
export interface LineaDePagoRealizado {
  pagoId: string;
  numeroDelPago: string;
  fecha: string;
  forma: FormaDePago;
  /** El cheque o la nota de Bancos, o el recibo en nota ligada, apertura y efectivo. */
  documentoBancario: string | null;
  cuenta: string | null;
  proveedorId: string;
  proveedorNombre: string;
  contrasena: string;
  documentoId: string;
  serie: string | null;
  numeroDelDocumento: string;
  monto: string;
  retencionDescontada: string;
  cubre: string;
  /** Quien ingresó el documento en Libro de compras. */
  registroElDocumento: string | null;
  /** Quien lo completó, si es otra persona. */
  completoElDocumento: string | null;
  autorizoElDocumento: string | null;
  registroElPago: string | null;
  misma: boolean;
  estado: 'vigente' | 'anulado';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

/** Las sumas de R6 por forma y estado del pago. */
export interface TotalDePagosPorForma {
  forma: FormaDePago;
  estado: 'vigente' | 'anulado';
  lineas: number;
  monto: string;
  retencion: string;
}

export interface PaginaDePagosRealizados {
  filas: LineaDePagoRealizado[];
  /** Todas las líneas que cumplen el filtro, no solo las de la página. */
  total: number;
  totales: TotalDePagosPorForma[];
}

export interface FiltroDeChequesPosfechados {
  empresaId: string;
  corte: string;
  proveedorId?: string;
  cuentaBancariaId?: string;
}

/** Un cheque entregado hasta el corte cuya fecha es posterior: ya se dio pero aún no rebaja el pasivo (R7). */
export interface ChequePosfechado {
  pagoId: string;
  numeroDelPago: string;
  fecha: string;
  cuentaBancariaId: string | null;
  cuenta: string | null;
  numeroDeCheque: string | null;
  proveedorId: string;
  proveedorNombre: string;
  /** En centavos, para sumarlo por cuenta y por semana. */
  montoCentavos: number;
  /** Bancos ya lo concilió: se pagó a la vista. */
  cobrado: boolean;
  /** Año y mes de la conciliación autorizada que lo marcó antes de su fecha; nulo si no. */
  cobradoEn: { anio: number; mes: number } | null;
}

/** Las consultas de los reportes de pagos: R6 y R7. */
export interface ConsultasDeReportesDePagos {
  pagosRealizados(
    filtro: FiltroDePagosRealizados,
    pagina: PaginacionDeDocumentos | null,
  ): Promise<PaginaDePagosRealizados>;
  chequesPosfechados(filtro: FiltroDeChequesPosfechados): Promise<ChequePosfechado[]>;
}
