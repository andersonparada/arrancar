/** Filas de cada hoja de un libro: constante del código, para saber cuántas hojas salen antes de dibujar. */
export const FILAS_POR_HOJA = 32;

/** Una hoja con filas: lo que «viene» de las anteriores y lo acumulado hasta ella. */
export interface PaginaConSubtotales<F, M> {
  /** Lugar de la hoja entre las de filas, desde 1. */
  numero: number;
  filas: F[];
  /** Subtotal de las hojas anteriores («Vienen»); nulo en la primera. */
  vienen: M | null;
  /** Subtotal con esta hoja incluida: «Van» si sigue otra hoja, «Total del período» si es la última. */
  acumulado: M;
  esUltima: boolean;
}

/** Las hojas de un libro. La hoja final del resumen lleva folio, pero nunca compite con las filas por el espacio. */
export interface LibroPaginadoConSubtotales<F, M> {
  paginas: PaginaConSubtotales<F, M>[];
  /** Hojas con folio: las de filas más la del resumen. */
  hojas: number;
}

/** Cómo se llevan los subtotales de un libro: el punto de partida y cómo se suman las filas de una hoja. */
export interface AcumuladorDeSubtotales<F, M> {
  enCero(): M;
  sumar(subtotal: M, filas: F[]): M;
}

/**
 * Reparte las filas en hojas de tamaño fijo, con los subtotales «Vienen» y «Van». Un libro sin filas tiene una
 * hoja vacía. Función pura: el número de hojas no depende del contenido de las filas, solo de cuántas son.
 */
export function paginarConSubtotales<F, M>(
  filas: F[],
  acumulador: AcumuladorDeSubtotales<F, M>,
  filasPorPagina = FILAS_POR_HOJA,
): LibroPaginadoConSubtotales<F, M> {
  const cantidad = Math.max(1, Math.ceil(filas.length / filasPorPagina));
  const paginas: PaginaConSubtotales<F, M>[] = [];
  let acumulado = acumulador.enCero();
  for (let indice = 0; indice < cantidad; indice++) {
    const deLaPagina = filas.slice(indice * filasPorPagina, (indice + 1) * filasPorPagina);
    const vienen = indice === 0 ? null : acumulado;
    acumulado = acumulador.sumar(acumulado, deLaPagina);
    paginas.push({ numero: indice + 1, filas: deLaPagina, vienen, acumulado, esUltima: indice === cantidad - 1 });
  }
  return { paginas, hojas: cantidad + 1 };
}

/** Cuántos folios gasta emitir un libro con esa cantidad de filas (las hojas de filas más la del resumen). */
export const foliosQueGasta = (cantidadDeFilas: number, filasPorPagina = FILAS_POR_HOJA): number =>
  Math.max(1, Math.ceil(cantidadDeFilas / filasPorPagina)) + 1;
