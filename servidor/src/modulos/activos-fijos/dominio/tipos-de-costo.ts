/** De dónde viene un costo: una línea del Libro de compras, un soporte escrito a mano o el saldo inicial. */
export const ORIGENES_DE_COSTO = ['linea_de_compra', 'manual', 'saldo_inicial'] as const;
export type OrigenDeCosto = (typeof ORIGENES_DE_COSTO)[number];

/** Las clases que se eligen a mano (aporte y donación van como «adquisición», con su soporte escrito). */
export const CLASES_DE_COSTO_ELEGIBLES = [
  'adquisicion',
  'importacion',
  'flete',
  'instalacion',
  'construccion',
  'honorarios',
  'desmantelamiento',
  'otro',
] as const;
export type ClaseDeCostoElegible = (typeof CLASES_DE_COSTO_ELEGIBLES)[number];

/** Las notas del libro fijan su clase solas: la nota de crédito resta y la de débito suma. */
export type ClaseDeCosto = ClaseDeCostoElegible | 'nota_de_credito' | 'nota_de_debito';

export const ESTADOS_DE_COSTO = ['vigente', 'anulado'] as const;
export type EstadoDeCosto = (typeof ESTADOS_DE_COSTO)[number];

/** Cuántos activos se crean como máximo en una sola operación (tamaño del cuerpo y tiempo de la transacción, R-15). */
export const MAXIMO_DE_UNIDADES = 200;
