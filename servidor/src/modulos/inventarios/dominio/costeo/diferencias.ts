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

export interface DiferenciaDeReparto {
  readonly movimientoId: string;
  readonly diferenciaAbsorbido: bigint;
  readonly diferenciaAResultados: bigint;
}

export interface RepartoGuardado {
  readonly absorbido: bigint;
  readonly aResultados: bigint;
}

/**
 * Repartos cuyo absorbido o a resultados cambió al recalcular (`nuevo − anterior`), para el campo `repartos` del
 * evento `inventarios.costo_recalculado` (§7.3). Solo cuentan los movimientos de valor guardados en `anteriores`.
 */
export function diferenciasDeReparto(
  anteriores: ReadonlyMap<string, RepartoGuardado>,
  nuevos: readonly ResultadoDeMovimiento[],
): DiferenciaDeReparto[] {
  const diferencias: DiferenciaDeReparto[] = [];
  for (const r of nuevos) {
    const antes = anteriores.get(r.id);
    if (!antes || (antes.absorbido === r.costo && antes.aResultados === r.aResultados)) continue;
    diferencias.push({
      movimientoId: r.id,
      diferenciaAbsorbido: r.costo - antes.absorbido,
      diferenciaAResultados: r.aResultados - antes.aResultados,
    });
  }
  return diferencias;
}
