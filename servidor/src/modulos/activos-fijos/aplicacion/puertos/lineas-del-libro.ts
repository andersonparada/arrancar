import type { LineaCapitalizable } from '../../dominio/linea-capitalizable.js';

/** Una línea del libro con su documento, para los mensajes de la auditoría y la bandeja. */
export interface LineaConReferencia extends LineaCapitalizable {
  /** Serie y número del documento: `A-1024`. */
  documento: string;
  numeroDeLinea: number;
}

/**
 * Las líneas del Libro de compras de la empresa activa, leídas de sus tablas (Activos fijos depende del libro). Con
 * las líneas ya bloqueadas, la suma de lo capitalizado es la verdadera.
 */
export interface LineasDelLibro {
  /** Las líneas pedidas que existen en la empresa, con lo capitalizado y si están descartadas. */
  buscar(lineaIds: readonly string[]): Promise<LineaConReferencia[]>;
}
