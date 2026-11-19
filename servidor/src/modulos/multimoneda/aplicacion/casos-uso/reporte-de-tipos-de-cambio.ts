import type { SerieDeTiposDelNucleo, TipoDeLaSerieDto } from '../puertos/serie-de-tipos.js';

/** La leyenda que lleva todo reporte de tipos de cambio (condición del servicio del Banguat). */
export const FUENTE_DEL_REPORTE = 'Banco de Guatemala';

interface Dependencias {
  serie: SerieDeTiposDelNucleo;
}

/** Qué moneda y qué fechas pide el reporte (`AAAA-MM-DD`, ambas incluidas). */
export interface FiltroDeTiposDeCambio {
  moneda: string;
  desde: string;
  hasta: string;
}

export interface ReporteDeTiposDeCambioDto extends FiltroDeTiposDeCambio {
  /** «Fuente: Banco de Guatemala»: va en la pantalla, en la impresión y en el Excel. */
  fuente: string;
  filas: TipoDeLaSerieDto[];
}

/**
 * El reporte «Tipos de cambio»: la serie vigente de una moneda en un rango, con su origen (el Banguat o un ingreso
 * manual de soporte). Es de lectura: los tipos son de toda la instalación y no llevan empresa.
 */
export class ReporteDeTiposDeCambio {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(filtro: FiltroDeTiposDeCambio): Promise<ReporteDeTiposDeCambioDto> {
    const filas = await this.dependencias.serie.serie(filtro.moneda, filtro.desde, filtro.hasta);
    return { ...filtro, fuente: FUENTE_DEL_REPORTE, filas };
  }
}
