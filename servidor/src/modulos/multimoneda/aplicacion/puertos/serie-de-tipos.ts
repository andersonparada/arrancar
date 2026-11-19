/** Un tipo de cambio de la serie de una moneda: quetzales por una unidad, del día en que rige. */
export interface TipoDeLaSerieDto {
  /** `AAAA-MM-DD`. */
  fecha: string;
  moneda: string;
  referencia: string;
  compra: string | null;
  venta: string | null;
  origen: 'banguat' | 'manual';
}

/** La serie vigente de una moneda; la lee del núcleo (los tipos son de toda la instalación). */
export interface SerieDeTiposDelNucleo {
  /** La versión vigente de cada día con tipo entre dos fechas, ambas incluidas, de la más vieja a la más nueva. */
  serie(moneda: string, desde: string, hasta: string): Promise<TipoDeLaSerieDto[]>;
}
