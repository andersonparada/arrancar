/** Cuántos documentos se completan o se autorizan en una sola petición. */
export const MAXIMO_POR_LOTE = 100;

/** Marca o desmarca un documento; no deja pasar del máximo del lote. */
export function alternarSeleccion(seleccion: readonly string[], id: string): string[] {
  if (seleccion.includes(id)) return seleccion.filter((marcado) => marcado !== id);
  return seleccion.length >= MAXIMO_POR_LOTE ? [...seleccion] : [...seleccion, id];
}

/** Marca los primeros documentos que se pueden escoger, hasta el máximo del lote. */
export const seleccionarTodos = (ids: readonly string[]): string[] => ids.slice(0, MAXIMO_POR_LOTE);

/** Deja solo lo que sigue estando entre los documentos que se pueden escoger. */
export const conservarSeleccion = (seleccion: readonly string[], ids: readonly string[]): string[] =>
  seleccion.filter((id) => ids.includes(id));

/** Todo lo que se podía marcar ya está marcado (o ya se llegó al máximo del lote). */
export function estaTodoSeleccionado(seleccion: readonly string[], ids: readonly string[]): boolean {
  return ids.length > 0 && seleccion.length >= Math.min(ids.length, MAXIMO_POR_LOTE);
}

/** El aviso de la barra cuando hay más para escoger de lo que cabe en un lote. */
export function avisoDeLote(disponibles: number): string {
  return disponibles > MAXIMO_POR_LOTE
    ? `Se hacen de ${MAXIMO_POR_LOTE} en ${MAXIMO_POR_LOTE}: al terminar el lote, escoja los siguientes.`
    : '';
}
