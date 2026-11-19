import type { EntradaDevolvible } from '../../dominio/devolucion.js';
import type { EntradaParaRepartir } from '../../dominio/rebaja.js';

/**
 * Lo que las devoluciones y rebajas necesitan saber de las entradas de las recepciones, y lo que los avisos del libro
 * necesitan saber de los documentos de la compra. Los movimientos se leen unidos a su documento (R-3).
 */
export interface ConsultasDeRecepciones {
  /**
   * Las entradas de recepciones **vigentes** pedidas, con lo ya devuelto de cada una. Las que no existen, no son de una
   * recepción vigente o son de una bodega que el usuario no ve, no salen.
   */
  entradasDevolvibles(movimientoIds: readonly string[]): Promise<EntradaDevolvible[]>;
  /** Las entradas vigentes de las recepciones de una factura del libro, en el orden del kardex. */
  entradasDeLaFactura(documentoDeCompraId: string): Promise<EntradaParaRepartir[]>;
  /** Los documentos vigentes que dependen del documento (devoluciones y rebajas de sus entradas): su número y clase. */
  documentosQueDependenDe(documentoId: string): Promise<string[]>;
  /** Los documentos vigentes de Inventarios nacidos de una factura o nota del libro: su número y clase. */
  documentosDeLaCompra(documentoDeCompraId: string): Promise<string[]>;
}
