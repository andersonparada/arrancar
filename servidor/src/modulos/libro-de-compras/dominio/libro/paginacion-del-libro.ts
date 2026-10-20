import { COLUMNAS_DE_DINERO, type FilaDelLibro, type MontosDelLibro } from './fila-del-libro.js';

/** Las filas de cada hoja: constante del código, para saber cuántas hojas salen antes de dibujar. */
export const FILAS_POR_PAGINA = 32;

/** Una hoja con filas del libro: lo que «viene» de las anteriores y lo acumulado hasta ella. */
export interface PaginaDelLibro {
  /** Lugar de la hoja entre las de filas, desde 1. */
  numero: number;
  filas: FilaDelLibro[];
  /** Subtotal de las hojas anteriores («Vienen»); nulo en la primera. */
  vienen: MontosDelLibro | null;
  /** Subtotal con esta hoja incluida: «Van» si sigue otra hoja, «Total del período» si es la última. */
  acumulado: MontosDelLibro;
  esUltima: boolean;
}

/**
 * Las hojas del libro. Además de las de filas, la hoja final lleva el resumen mensual, así que nunca
 * compite con las filas por el espacio.
 */
export interface LibroPaginado {
  paginas: PaginaDelLibro[];
  /** Hojas con folio: las de filas más la del resumen. */
  hojas: number;
}

function montosEnCero(): MontosDelLibro {
  return Object.fromEntries(COLUMNAS_DE_DINERO.map((columna) => [columna, 0])) as unknown as MontosDelLibro;
}

/** Suma las columnas de dinero de las filas a un subtotal, sin tocar el original. */
export function sumarFilas(subtotal: MontosDelLibro, filas: FilaDelLibro[]): MontosDelLibro {
  const suma = { ...subtotal };
  for (const fila of filas) for (const columna of COLUMNAS_DE_DINERO) suma[columna] += fila[columna];
  return suma;
}

/**
 * Reparte las filas en hojas de tamaño fijo, con los subtotales «Vienen» y «Van». Un libro sin filas tiene una
 * hoja vacía. Función pura: el número de hojas no depende del contenido de las filas, solo de cuántas son.
 */
export function paginarLibro(filas: FilaDelLibro[], filasPorPagina = FILAS_POR_PAGINA): LibroPaginado {
  const cantidad = Math.max(1, Math.ceil(filas.length / filasPorPagina));
  const paginas: PaginaDelLibro[] = [];
  let acumulado = montosEnCero();
  for (let indice = 0; indice < cantidad; indice++) {
    const deLaPagina = filas.slice(indice * filasPorPagina, (indice + 1) * filasPorPagina);
    const vienen = indice === 0 ? null : acumulado;
    acumulado = sumarFilas(acumulado, deLaPagina);
    paginas.push({ numero: indice + 1, filas: deLaPagina, vienen, acumulado, esUltima: indice === cantidad - 1 });
  }
  return { paginas, hojas: cantidad + 1 };
}

/** Cuántos folios gasta emitir un libro con esa cantidad de filas. */
export const foliosQueGasta = (cantidadDeFilas: number, filasPorPagina = FILAS_POR_PAGINA): number =>
  Math.max(1, Math.ceil(cantidadDeFilas / filasPorPagina)) + 1;
