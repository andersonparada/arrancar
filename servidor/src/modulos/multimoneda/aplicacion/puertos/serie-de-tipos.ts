/** Un tipo de cambio de la serie de una moneda: quetzales por una unidad, del día en que rige. */
export interface TipoDeLaSerieDto {
  /** `AAAA-MM-DD`. */
  fecha: string;
  moneda: string;
  referencia: string;
  /** Lo publicado por el Banguat, en su convención. */
  compra: string | null;
  venta: string | null;
  /** Con que se calculó la referencia: quetzales por unidad, dólares por unidad o unidades por dólar. */
  convencion: 'quetzales_por_unidad' | 'usd_por_unidad' | 'unidades_por_usd' | null;
  /** La referencia del dólar del Banguat usado, en las monedas que se cruzan. */
  dolarUsado: string | null;
  origen: 'banguat' | 'manual';
}

/** La serie vigente de una moneda; la lee del núcleo (los tipos son de toda la instalación). */
export interface SerieDeTiposDelNucleo {
  /** La versión vigente de cada día con tipo entre dos fechas, ambas incluidas, de la más vieja a la más nueva. */
  serie(moneda: string, desde: string, hasta: string): Promise<TipoDeLaSerieDto[]>;
}
