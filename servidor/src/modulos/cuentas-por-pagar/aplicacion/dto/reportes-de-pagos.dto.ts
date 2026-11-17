import type { LineaDePagoRealizado, TotalDePagosPorForma } from '../puertos/puertos-de-reportes-de-pagos.js';

/** Lo que suman las líneas de un grupo de pagos. */
export interface SumaDePagosDto {
  lineas: number;
  monto: string;
  retencionDescontada: string;
  /** Monto más retención: lo que los pagos cubren de los documentos. */
  cubre: string;
}

/** R6: las líneas de los pagos del rango (una por documento pagado) y sus totales. */
export interface ReporteDePagosRealizadosDto {
  desde: string;
  hasta: string;
  filas: LineaDePagoRealizado[];
  /** Todas las líneas que cumplen el filtro. */
  total: number;
  pagina: number;
  limite: number | null;
  totales: {
    porForma: Array<TotalDePagosPorForma & { cubre: string }>;
    vigentes: SumaDePagosDto;
    anulados: SumaDePagosDto;
  };
  leyendas: string[];
}

/** Un cheque posfechado al corte (R7). */
export interface FilaDeChequePosfechadoDto {
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
  /** `mm/aaaa` de la conciliación autorizada que lo marcó cobrado antes de su fecha. */
  cobradoEn: string | null;
}

export interface SumaDeChequesDto {
  cantidad: number;
  monto: string;
}

/** R7: lo entregado y aún no rebajado al corte; el total es el «Comprometido» de R1. */
export interface ReporteDeChequesPosfechadosDto {
  corte: string;
  filas: FilaDeChequePosfechadoDto[];
  totalesPorCuenta: Array<SumaDeChequesDto & { cuentaBancariaId: string | null; cuenta: string | null }>;
  totalesPorSemana: Array<SumaDeChequesDto & { desde: string; hasta: string }>;
  total: SumaDeChequesDto;
  leyendas: string[];
}
