import type { OpcionSugerida } from '../../dominio/sugerencias/tipos.js';

export type { OpcionSugerida } from '../../dominio/sugerencias/tipos.js';

/** Lo que se sugiere para un movimiento; `movimientoId` falta cuando se pide al capturar. */
export interface SugerenciaDeConcepto {
  sugerido: OpcionSugerida | null;
  alternativas: OpcionSugerida[];
  /** Los casos que votaron, por cualquier concepto. */
  casosComparados: number;
}

export interface SugerenciaDeMovimiento extends SugerenciaDeConcepto {
  movimientoId: string;
}

/** La bandeja «Sin clasificar» con sus sugerencias y los parámetros aplicados (el cliente no decide nada). */
export interface RespuestaDeSugerencias {
  confianzaMinima: number;
  vidaMediaDias: number;
  /** Hubo más pendientes de los que se calculan: conviene acotar las fechas. */
  truncado: boolean;
  /** Una por pendiente, también las vacías. */
  sugerencias: SugerenciaDeMovimiento[];
}

/** Lo que se sabe de un movimiento que todavía no se guarda. */
export interface SolicitudDeSugerencia {
  tipo: 'credito' | 'debito' | 'cheque';
  cuentaBancariaId: string;
  fecha?: string | null;
  monto?: string | null;
  beneficiario?: string | null;
  referencia?: string | null;
  observaciones?: string | null;
}
