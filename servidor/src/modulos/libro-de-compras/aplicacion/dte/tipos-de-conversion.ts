import type { CampoDelDte } from './mapa-de-encabezados-sat.js';

export type MotivoDeRechazoDelDte =
  | 'dato_ilegible'
  | 'tipo_sin_familia'
  | 'nit_receptor_distinto'
  | 'moneda_no_admitida'
  | 'total_en_cero'
  | 'impuestos_exceden_total'
  | 'autorizacion_repetida';

/** Una fila que no entra a la bandeja, con el motivo y lo que se vio. */
export class FilaRechazada extends Error {
  constructor(
    readonly motivo: MotivoDeRechazoDelDte,
    readonly detalle: string,
  ) {
    super(detalle);
  }
}

/** Dónde está cada columna en el archivo (`-1` si no viene). */
export interface ColumnasDelArchivo {
  campos: Record<CampoDelDte, number>;
  impuestos: { nombre: string; posicion: number }[];
  encabezados: readonly string[];
}

export interface OpcionesDeConversion {
  /** NIT de la empresa, normalizado: el receptor de todo DTE recibido. */
  nitDeLaEmpresa: string;
  zonaHoraria: string;
  /** Decimales de la configuración (`core.regional.decimales_montos`); nunca se usan menos de dos. */
  decimales: number;
  /** Fecha de la carga: es la de anulación cuando el archivo solo trae la marca. */
  hoy: string;
}
