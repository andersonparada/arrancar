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

interface ConPareja {
  id: string;
  revierteAId: string | null;
}

/**
 * El otro movimiento del par original + inverso, si los dos están entre los candidatos (si el original
 * ya se marcó en una conciliación anterior, el inverso va solo).
 */
export function parejaDe(candidatos: readonly ConPareja[], movimientoId: string): string | null {
  const idDelOtro =
    candidatos.find((c) => c.id === movimientoId)?.revierteAId ??
    candidatos.find((c) => c.revierteAId === movimientoId)?.id ??
    null;
  return idDelOtro && candidatos.some((c) => c.id === idDelOtro) ? idDelOtro : null;
}

/** Marca o desmarca un movimiento y, con él, su pareja (un original y su inverso se conciliaron juntos). */
export function conAlternadoConPareja(
  marcados: ReadonlySet<string>,
  movimientoId: string,
  candidatos: readonly ConPareja[],
): Set<string> {
  const pareja = parejaDe(candidatos, movimientoId);
  const ids = pareja ? [movimientoId, pareja] : [movimientoId];
  const agregar = !marcados.has(movimientoId);
  const copia = new Set(marcados);
  for (const id of ids) {
    if (agregar) copia.add(id);
    else copia.delete(id);
  }
  return copia;
}
