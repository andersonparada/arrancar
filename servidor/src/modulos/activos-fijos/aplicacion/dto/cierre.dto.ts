import type { Hallazgo } from '../../dominio/depreciacion/hallazgos-del-cierre.js';

/** Lo que saldrá (o salió) de un mes de depreciación; el dinero va en quetzales con dos decimales, como texto. */
export interface TotalesDelCierreDto {
  contable: string;
  fiscal: string;
  activosDepreciados: number;
}

/** Lo que se ve antes de cerrar un mes (§6.9), con la huella para saber si algo cambió entre revisar y cerrar. */
export interface RevisionDelCierreDto {
  periodo: string;
  hallazgos: Hallazgo[];
  /** Falso si algún hallazgo bloquea. */
  puedeCerrar: boolean;
  totales: TotalesDelCierreDto;
  regimenIsr: string | null;
  huella: string;
}

export interface CierreDto {
  periodo: string;
  estado: 'cerrado' | 'reabierto';
  cerradoEn: string;
  cerradoPor: string;
  reabiertoEn: string | null;
  reabiertoPor: string | null;
  motivoDeReapertura: string | null;
  regimenIsr: string | null;
  totalContable: string;
  totalFiscal: string;
  activosDepreciados: number;
}

export interface TotalDeClaseDto {
  claseId: string;
  clase: string;
  contable: string;
  fiscal: string;
}

/** El cierre con su depreciación por clase: lo que queda en la auditoría al reabrir. */
export interface CierreConClasesDto extends CierreDto {
  porClase: TotalDeClaseDto[];
}

/** Los meses cerrados y cuál es el siguiente por cerrar (`null` si todavía no hay de dónde empezar). */
export interface EstadoDeDepreciacionDto {
  siguienteMes: string | null;
  cierres: CierreDto[];
}
