/**
 * El número correlativo que se le asignó a un comprobante y el año al que pertenece: `anio` es 0
 * cuando la empresa no reinicia sus correlativos cada año (lo normal).
 */
export interface Numeracion {
  numero: number;
  anio: number;
}
