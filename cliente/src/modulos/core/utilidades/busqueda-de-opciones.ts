/**
 * Lógica pura del filtro de un selector con buscador: normalizar texto para comparar
 * sin distinguir mayúsculas ni tildes, filtrar opciones y mover la opción activa con
 * el teclado. Sin Vue, para poder probarla sin montar componentes.
 */

/** Una opción de una lista que se puede buscar por su texto. */
export interface OpcionBuscable<T> {
  valor: T;
  texto: string;
}

/** A partir de cuántas opciones vale la pena mostrar el campo de búsqueda. */
export const UMBRAL_PARA_MOSTRAR_BUSCADOR = 7;

/** Minúsculas y sin tildes, para comparar "Peña" con "pena" como iguales. */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Las opciones cuyo texto contiene lo buscado, sin distinguir mayúsculas ni tildes. */
export function filtrarOpciones<T>(opciones: OpcionBuscable<T>[], busqueda: string): OpcionBuscable<T>[] {
  const normalizada = normalizarTexto(busqueda.trim());
  if (!normalizada) return opciones;
  return opciones.filter((opcion) => normalizarTexto(opcion.texto).includes(normalizada));
}

/**
 * El siguiente índice activo al mover el cursor con las flechas, dando la vuelta en
 * los bordes de la lista. Con la lista vacía no hay nada que activar.
 */
export function moverIndiceActivo(indiceActual: number, cantidadDeOpciones: number, paso: 1 | -1): number {
  if (cantidadDeOpciones === 0) return -1;
  const siguiente = indiceActual + paso;
  if (siguiente < 0) return cantidadDeOpciones - 1;
  if (siguiente >= cantidadDeOpciones) return 0;
  return siguiente;
}

/** El índice, dentro de las opciones filtradas, de la opción elegida actualmente (o -1 si ninguna). */
export function indiceDeOpcionElegida<T>(opciones: OpcionBuscable<T>[], valorElegido: T): number {
  return opciones.findIndex((opcion) => opcion.valor === valorElegido);
}
