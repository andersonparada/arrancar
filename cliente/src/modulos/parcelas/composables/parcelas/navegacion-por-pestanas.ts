/**
 * A qué pestaña pasa el teclado: flechas a los lados (con vuelta), Inicio y Fin. `null` si la tecla no es de
 * navegación o no hay pestañas.
 */
export function pestanaTrasLaTecla<T extends string>(claves: readonly T[], actual: T, tecla: string): T | null {
  const indice = claves.indexOf(actual);
  const ultimo = claves.length - 1;
  if (ultimo < 0 || indice < 0) return null;
  const destinos: Record<string, number> = {
    ArrowRight: indice === ultimo ? 0 : indice + 1,
    ArrowLeft: indice === 0 ? ultimo : indice - 1,
    Home: 0,
    End: ultimo,
  };
  const destino = destinos[tecla];
  return destino === undefined ? null : (claves[destino] ?? null);
}
