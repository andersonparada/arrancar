import type { LineaDeCompra } from '../../dominio/linea-de-compra.js';

/**
 * Las líneas del Libro de compras de la empresa activa, leídas de sus tablas (Inventarios depende del libro) con lo
 * que ya se les aplicó. La suma es la verdadera cuando las líneas ya están bloqueadas.
 */
export interface LineasDeCompra {
  /**
   * Toma el candado de cada línea (`inventarios.linea:<id>`), en orden por id, hasta el fin de la transacción: dos
   * recepciones de la misma línea no se pasan del costo.
   */
  bloquear(lineaIds: readonly string[]): Promise<void>;
  /** Las líneas pedidas que existen en la empresa. Toma lectura compartida de sus documentos (anular los espera). */
  buscar(lineaIds: readonly string[]): Promise<LineaDeCompra[]>;
}
