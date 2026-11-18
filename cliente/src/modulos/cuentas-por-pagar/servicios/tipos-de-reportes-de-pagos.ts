/** Cómo se pagó (la forma del pago de Cuentas por pagar). */
export type FormaDelPago = 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura' | 'efectivo';

export type EstadoDelPagoEnReporte = 'vigente' | 'anulado';

/** Una fila de R6: un documento pagado; el pago se repite en cada una de sus líneas. */
export interface LineaDePagoRealizado {
  pagoId: string;
  numeroDelPago: string;
  fecha: string;
  forma: FormaDelPago;
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
  registroElDocumento: string | null;
  completoElDocumento: string | null;
  autorizoElDocumento: string | null;
  registroElPago: string | null;
  misma: boolean;
  estado: EstadoDelPagoEnReporte;
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

export interface SumaDePagos {
  lineas: number;
  monto: string;
  retencionDescontada: string;
  cubre: string;
}

export interface TotalDePagosPorForma {
  forma: FormaDelPago;
  estado: EstadoDelPagoEnReporte;
  lineas: number;
  monto: string;
  retencion: string;
  cubre: string;
}

export interface ReporteDePagosRealizados {
  desde: string;
  hasta: string;
  filas: LineaDePagoRealizado[];
  total: number;
  pagina: number;
  limite: number | null;
  totales: { porForma: TotalDePagosPorForma[]; vigentes: SumaDePagos; anulados: SumaDePagos };
  leyendas: string[];
}

export interface FilaDeChequePosfechado {
  pagoId: string;
  numeroDelPago: string;
  fecha: string;
  diasQueFaltan: number;
  cuenta: string | null;
  numeroDeCheque: string | null;
  proveedorId: string;
  proveedorNombre: string;
  monto: string;
  cobrado: boolean;
  /** `mm/aaaa` de la conciliación que lo marcó cobrado antes de su fecha. */
  cobradoEn: string | null;
}

export interface SumaDeCheques {
  cantidad: number;
  monto: string;
}

export interface ReporteDeChequesPosfechados {
  corte: string;
  filas: FilaDeChequePosfechado[];
  totalesPorCuenta: Array<SumaDeCheques & { cuentaBancariaId: string | null; cuenta: string | null }>;
  totalesPorSemana: Array<SumaDeCheques & { desde: string; hasta: string }>;
  total: SumaDeCheques;
  leyendas: string[];
}
