import type { ResultadoDeMovimiento } from './tipos.js';

export interface DiferenciaDeCosto {
  readonly movimientoId: string;
  readonly diferenciaCentavos: bigint;
}

/**
 * Salidas cuyo costo cambió entre lo guardado (`anteriores`: id → costo) y lo recalculado (`nuevo − anterior`),
 * para el evento `inventarios.costo_recalculado`. Solo cuentan las que están en `idsDeSalidas`.
 */
export function diferenciasDeCosto(
  anteriores: ReadonlyMap<string, bigint>,
  nuevos: readonly ResultadoDeMovimiento[],
  idsDeSalidas: ReadonlySet<string>,
): DiferenciaDeCosto[] {
  const diferencias: DiferenciaDeCosto[] = [];
  for (const r of nuevos) {
    const antes = anteriores.get(r.id);
    if (!idsDeSalidas.has(r.id) || antes === undefined || antes === r.costo) continue;
    diferencias.push({ movimientoId: r.id, diferenciaCentavos: r.costo - antes });
  }
  return diferencias;
}
