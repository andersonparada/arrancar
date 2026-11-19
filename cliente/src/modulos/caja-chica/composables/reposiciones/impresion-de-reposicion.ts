import type { Comprobante } from '../../servicios/tipos-de-comprobantes';
import type { LineaDeReposicion } from '../../servicios/tipos-de-reposiciones';
import { centavosConSigno, textoConSigno } from '../dinero';

/** Un comprobante en la hoja con lo que aporta a la reposición (con signo: lo que resta va negativo). */
export type LineaImpresa = LineaDeReposicion;

export interface GrupoDeLineas {
  titulo: string;
  lineas: LineaImpresa[];
  /** Con signo, texto con dos decimales. */
  subtotal: string;
}

/** En el orden en que salen en la hoja. */
const TITULOS = [
  'Gastos de operación',
  'Compras de activo fijo',
  'Faltantes de efectivo',
  'Descuentan: notas de crédito y sobrantes',
];

/** A qué grupo de la hoja pertenece un comprobante (lo que resta manda sobre lo demás). */
function grupoDe(comprobante: Comprobante): number {
  if (comprobante.resta) return 3;
  if (comprobante.clase === 'faltante') return 2;
  return comprobante.conActivoFijo ? 1 : 0;
}

/**
 * Los pendientes como líneas de la hoja de solicitud: lo que resta (notas de crédito, sobrantes) va con signo negativo,
 * igual que en las líneas de una reposición ya registrada.
 */
export function lineasDeLosPendientes(pendientes: readonly Comprobante[]): LineaImpresa[] {
  return pendientes.map((comprobante) => ({
    comprobante,
    monto: comprobante.resta ? `-${comprobante.monto}` : comprobante.monto,
  }));
}

/** Las líneas repartidas por concepto como las pide Bancos (operación, activo, faltante) y las que descuentan. */
export function agruparLasLineas(lineas: readonly LineaImpresa[]): GrupoDeLineas[] {
  return TITULOS.map((titulo, indice) => {
    const propias = lineas.filter(({ comprobante }) => grupoDe(comprobante) === indice);
    const centavos = propias.reduce((suma, { monto }) => suma + (centavosConSigno(monto) ?? 0), 0);
    return { titulo, lineas: propias, subtotal: textoConSigno(centavos) };
  }).filter(({ lineas: propias }) => propias.length > 0);
}
