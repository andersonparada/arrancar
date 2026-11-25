import {
  FILAS_POR_HOJA,
  foliosQueGasta as foliosQueGastaUnLibro,
  paginarConSubtotales,
  type LibroPaginadoConSubtotales,
  type PaginaConSubtotales,
} from '../../../core/impresion/pdf/paginacion-con-subtotales.js';
import { COLUMNAS_DE_DINERO, type FilaDelLibro, type MontosDelLibro } from './fila-del-libro.js';

/** Las filas de cada hoja: constante del código, para saber cuántas hojas salen antes de dibujar. */
export const FILAS_POR_PAGINA = FILAS_POR_HOJA;

/** Una hoja con filas del libro de compras. */
export type PaginaDelLibro = PaginaConSubtotales<FilaDelLibro, MontosDelLibro>;

/** Las hojas del libro de compras. */
export type LibroPaginado = LibroPaginadoConSubtotales<FilaDelLibro, MontosDelLibro>;

function montosEnCero(): MontosDelLibro {
  return Object.fromEntries(COLUMNAS_DE_DINERO.map((columna) => [columna, 0])) as unknown as MontosDelLibro;
}

/** Suma las columnas de dinero de las filas a un subtotal, sin tocar el original. */
export function sumarFilas(subtotal: MontosDelLibro, filas: FilaDelLibro[]): MontosDelLibro {
  const suma = { ...subtotal };
  for (const fila of filas) for (const columna of COLUMNAS_DE_DINERO) suma[columna] += fila[columna];
  return suma;
}

/** Reparte las filas del libro en hojas de tamaño fijo, con los subtotales «Vienen» y «Van». */
export const paginarLibro = (filas: FilaDelLibro[], filasPorPagina = FILAS_POR_PAGINA): LibroPaginado =>
  paginarConSubtotales(filas, { enCero: montosEnCero, sumar: sumarFilas }, filasPorPagina);

/** Cuántos folios gasta emitir un libro con esa cantidad de filas. */
export const foliosQueGasta = foliosQueGastaUnLibro;
