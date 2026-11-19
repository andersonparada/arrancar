/** Los dos libros en que se deprecia cada activo (§3.5). */
export type LibroDeDepreciacion = 'contable' | 'fiscal';

export const CAUSAS_DE_TRAMO = [
  'inicio_de_uso',
  'saldo_inicial',
  'mejora',
  'costo_posterior',
  'revision_de_estimacion',
  'cambio_de_matricula',
  'division',
] as const;
export type CausaDeTramo = (typeof CAUSAS_DE_TRAMO)[number];

/**
 * Un tramo de depreciación tal como lo calcula el dominio (§5.8), todo en centavos enteros. El contable lleva `meses`;
 * el fiscal, `porcentaje` y la base sobre la que se aplica.
 */
export interface TramoCalculado {
  libro: LibroDeDepreciacion;
  desdePeriodo: string;
  causa: CausaDeTramo;
  porDepreciarCentavos: number;
  valorResidualCentavos: number;
  meses: number | null;
  porcentaje: string | null;
  baseDelPorcentajeCentavos: number | null;
  cuotaMensualCentavos: number;
  /** Lo que una nota de crédito bajó por debajo del residual (contable) o de lo ya depreciado (fiscal), §7.4. */
  excesoDeNotaDeCreditoCentavos: number;
}

/** Un tramo ya guardado: lleva el id con que sus cuotas lo señalan. */
export interface TramoGuardado extends TramoCalculado {
  id: string;
}
