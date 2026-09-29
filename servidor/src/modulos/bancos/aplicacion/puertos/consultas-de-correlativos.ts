import type { ExplicacionDeHuecoDto } from '../dto/correlativo.dto.js';

/** El correlativo de una clave y año, tal como quedó en la tabla de correlativos, con sus huecos ya calculados. */
export interface RangoDeCorrelativo {
  clave: string;
  anio: number;
  ultimo: number;
  emitidos: number;
  huecos: number[];
}

/** Una entrada de la auditoría que habla de un número. */
export interface ExplicacionPorNumero extends ExplicacionDeHuecoDto {
  numero: number;
}

export interface HuecosPorExplicar {
  clave: string;
  anio: number;
  huecos: number[];
}

/** Lecturas del reporte de correlativos; se llaman dentro de la unidad de trabajo del caso de uso. */
export interface ConsultasDeCorrelativos {
  /** Los correlativos de la empresa; con `clave`, solo ese. */
  rangos(clave?: string): Promise<RangoDeCorrelativo[]>;
  /** Lo que la auditoría de la empresa dice de esos números (bajas y cambios de tipo). */
  explicaciones(porExplicar: HuecosPorExplicar): Promise<ExplicacionPorNumero[]>;
}
