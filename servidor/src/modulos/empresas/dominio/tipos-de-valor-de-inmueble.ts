/** Las dos series de valores del inmueble: cada una es una base que admite el art. 26 de la Ley de Actualización Tributaria. */
export const FUENTES_DE_VALOR = ['matricula_fiscal', 'catastro_municipal'] as const;
export type FuenteDeValor = (typeof FUENTES_DE_VALOR)[number];

/** Cómo se obtuvo el valor (independiente de la fuente). */
export const ORIGENES_DE_VALOR = [
  'avaluo_dicabi',
  'avaluo_municipal',
  'autoavaluo',
  'valuador_autorizado',
  'otro',
] as const;
export type OrigenDeValor = (typeof ORIGENES_DE_VALOR)[number];

/** Categorías del IUSI (Decreto 18-2026, art. 11 reformado del Decreto 15-98). */
export const CATEGORIAS_DE_IUSI = ['vivienda', 'residencial', 'mixto', 'comercial', 'otros'] as const;
export type CategoriaDeIusi = (typeof CATEGORIAS_DE_IUSI)[number];
