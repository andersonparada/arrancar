/** Un id de movimiento, más o menos, en el conjunto de marcados (sin mutar el original). */
export function conAlternado(marcados: ReadonlySet<string>, movimientoId: string): Set<string> {
  const copia = new Set(marcados);
  if (copia.has(movimientoId)) copia.delete(movimientoId);
  else copia.add(movimientoId);
  return copia;
}

/** Los ids de los movimientos ya marcados, tal como llegaron del servidor. */
export function idsMarcados(movimientos: readonly { id: string; marcado: boolean }[]): Set<string> {
  return new Set(movimientos.filter((m) => m.marcado).map((m) => m.id));
}
