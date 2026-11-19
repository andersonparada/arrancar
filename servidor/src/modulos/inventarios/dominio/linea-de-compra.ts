import { LineaDescartada, LineaNoRecibible, LineaSobrerrecibida } from './errores-de-recepcion.js';

/**
 * Una línea del Libro de compras vista desde Inventarios: lo que costó y lo que ya se le aplicó. En una factura,
 * `aplicadoCentavos` es lo recibido (Σ de las entradas vigentes); en una nota de crédito, lo que sus devoluciones y
 * rebajas vigentes le han restado al costo (siempre en positivo).
 */
export interface LineaDeCompra {
  lineaId: string;
  documentoId: string;
  /** Familia del documento (`factura`, `nota_de_credito`…): es del libro, aquí solo se compara. */
  tipoDeDocumento: string;
  documentoVigente: boolean;
  /** La factura que corrige una nota (del libro); nulo en las demás. */
  documentoAfectadoId: string | null;
  /** Serie y número del documento: `A-1024`. */
  documento: string;
  numeroDeLinea: number;
  fechaEmision: string;
  esInventario: boolean;
  /** `total − iva + iva no acreditable`, siempre positivo. */
  costoCentavos: bigint;
  aplicadoCentavos: bigint;
  descartada: boolean;
}

export const esNotaDeCredito = (linea: Pick<LineaDeCompra, 'tipoDeDocumento'>): boolean =>
  linea.tipoDeDocumento === 'nota_de_credito';

/** Lo que falta por aplicar a la línea. */
export const pendienteDeLinea = (linea: LineaDeCompra): bigint => linea.costoCentavos - linea.aplicadoCentavos;

/**
 * Una línea se recibe si es de un documento vigente que no es nota de crédito, está marcada como inventario y no se
 * descartó de la bandeja.
 * @throws LineaNoRecibible si el documento está anulado, es una nota de crédito o la línea no es de inventario.
 * @throws LineaDescartada si se descartó.
 */
export function exigirRecibible(linea: LineaDeCompra): void {
  if (!linea.documentoVigente) throw new LineaNoRecibible('El documento de la línea está anulado en el libro.');
  if (esNotaDeCredito(linea))
    throw new LineaNoRecibible('Una nota de crédito se aplica con una devolución o una rebaja.');
  if (linea.descartada) throw new LineaDescartada();
  if (!linea.esInventario) throw new LineaNoRecibible('La línea no está marcada como inventario en el libro.');
}

/**
 * Una nota de crédito se aplica si es de un documento vigente y corrige una factura del libro.
 * @throws LineaNoRecibible si no es una nota vigente de una factura del libro.
 * @throws LineaDescartada si se descartó.
 */
export function exigirNotaAplicable(linea: LineaDeCompra): void {
  if (!linea.documentoVigente) throw new LineaNoRecibible('La nota de crédito está anulada en el libro.');
  if (!esNotaDeCredito(linea) || linea.documentoAfectadoId === null)
    throw new LineaNoRecibible('La línea no es de una nota de crédito de una factura del libro.');
  if (linea.descartada) throw new LineaDescartada();
}

/**
 * La regla de la línea: lo aplicado más lo nuevo no pasa de su costo.
 * @throws LineaSobrerrecibida con lo que falta.
 */
export function exigirCapacidadDeLinea(linea: LineaDeCompra, nuevoCentavos: bigint): void {
  if (nuevoCentavos > pendienteDeLinea(linea)) throw new LineaSobrerrecibida(pendienteDeLinea(linea));
}
