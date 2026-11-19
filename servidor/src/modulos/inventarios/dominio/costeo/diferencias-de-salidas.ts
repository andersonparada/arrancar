import { diferenciasDeCosto, diferenciasDeReparto, type RepartoGuardado } from './diferencias.js';
import { esDeReparto, type MovimientoDelKardex } from './movimientos-del-kardex.js';
import type { ResultadoDeMovimiento } from './tipos.js';

/** Una salida anterior cuyo costo cambió, para el evento `inventarios.costo_recalculado`. */
export interface DiferenciaDeSalida {
  movimientoId: string;
  documentoId: string;
  fecha: string;
  diferenciaCentavos: number;
}

/**
 * Las salidas ya registradas cuyo costo cambió al recalcular. Las del documento que causa el recálculo (`nuevos`) no
 * cuentan: su costo se calcula por primera vez. Solo cuentan las que calcula el método.
 */
export function diferenciasDeSalidas(
  guardados: readonly MovimientoDelKardex[],
  resultados: readonly ResultadoDeMovimiento[],
  nuevos: ReadonlySet<string>,
): DiferenciaDeSalida[] {
  const anteriores = new Map<string, bigint>();
  const porId = new Map(guardados.map((m) => [m.id, m]));
  for (const m of guardados) {
    if (!nuevos.has(m.id) && m.tipo === 'salida' && m.costoDelMetodo) anteriores.set(m.id, -m.costoTotal);
  }
  const cambios = diferenciasDeCosto(anteriores, resultados, new Set(anteriores.keys()));
  return cambios.map((c) => {
    const salida = porId.get(c.movimientoId)!;
    return {
      movimientoId: c.movimientoId,
      documentoId: salida.documentoId,
      fecha: salida.fecha,
      diferenciaCentavos: Number(c.diferenciaCentavos),
    };
  });
}

/** Un reparto ya registrado cuyo absorbido o a resultados cambió, para el evento `inventarios.costo_recalculado`. */
export interface DiferenciaDeRepartoGuardado {
  movimientoId: string;
  documentoId: string;
  fecha: string;
  movimientoDeEntradaId: string;
  diferenciaAbsorbidoCentavos: number;
  diferenciaAResultadosCentavos: number;
}

function repartosAnteriores(
  guardados: readonly MovimientoDelKardex[],
  nuevos: ReadonlySet<string>,
): Map<string, RepartoGuardado> {
  const anteriores = new Map<string, RepartoGuardado>();
  for (const m of guardados) {
    if (nuevos.has(m.id) || !esDeReparto(m)) continue;
    anteriores.set(m.id, { absorbido: m.costoTotal, aResultados: m.montoAResultados });
  }
  return anteriores;
}

/**
 * Los repartos (costos adicionales y rebajas) ya registrados cuyo absorbido cambió al recalcular (V-2). Los del
 * documento que causa el recálculo (`nuevos`) no cuentan: se calculan por primera vez.
 */
export function diferenciasDeRepartos(
  guardados: readonly MovimientoDelKardex[],
  resultados: readonly ResultadoDeMovimiento[],
  nuevos: ReadonlySet<string>,
): DiferenciaDeRepartoGuardado[] {
  const porId = new Map(guardados.map((m) => [m.id, m]));
  return diferenciasDeReparto(repartosAnteriores(guardados, nuevos), resultados).map((d) => {
    const movimiento = porId.get(d.movimientoId)!;
    return {
      movimientoId: d.movimientoId,
      documentoId: movimiento.documentoId,
      fecha: movimiento.fecha,
      movimientoDeEntradaId: movimiento.movimientoDeOrigenId!,
      diferenciaAbsorbidoCentavos: Number(d.diferenciaAbsorbido),
      diferenciaAResultadosCentavos: Number(d.diferenciaAResultados),
    };
  });
}
