import type { FiltroDeMovimientos } from '../../servicios/movimientos.api';
import type { FiltroPorConcepto } from '../../servicios/movimientos-por-concepto.api';
import { rangoDelMesActual } from '../comunes/rango-de-fechas';

/** Lo que se elige en los filtros: cuenta (o todas), rango de fechas y conceptos (ninguno elegido = todos). */
export interface FiltrosPorConcepto {
  cuentaBancariaId: string | null;
  desde: string;
  hasta: string;
  conceptoIds: string[];
}

/** El servidor acepta hasta 50 conceptos por consulta. */
export const MAXIMO_DE_CONCEPTOS = 50;

/** Al abrir: todas las cuentas, todos los conceptos y el mes en curso. */
export const filtrosPorOmision = (hoy: Date = new Date()): FiltrosPorConcepto => ({
  cuentaBancariaId: null,
  ...rangoDelMesActual(hoy),
  conceptoIds: [],
});

/** Lo que se manda al servidor: los conceptos van separados por comas y, sin ninguno, no filtran. */
export const filtroDeLaConsulta = ({
  cuentaBancariaId,
  desde,
  hasta,
  conceptoIds,
}: FiltrosPorConcepto): FiltroPorConcepto => ({
  cuentaBancariaId: cuentaBancariaId ?? undefined,
  desde,
  hasta,
  conceptoIds: conceptoIds.length ? conceptoIds.join(',') : undefined,
});

/** El detalle de un concepto es el reporte de movimientos con el mismo rango y cuenta, filtrado por ese concepto. */
export const filtroDelDetalle = (
  { cuentaBancariaId, desde, hasta }: FiltrosPorConcepto,
  conceptoId: string,
): FiltroDeMovimientos => ({ cuentaBancariaId: cuentaBancariaId ?? undefined, desde, hasta, conceptoId });

/** Marca o desmarca un concepto; con el tope de conceptos lleno no deja marcar más. */
export function alternarConcepto(elegidos: readonly string[], conceptoId: string): string[] {
  if (elegidos.includes(conceptoId)) return elegidos.filter((id) => id !== conceptoId);
  return elegidos.length >= MAXIMO_DE_CONCEPTOS ? [...elegidos] : [...elegidos, conceptoId];
}

/** Lo que dice el selector cerrado. */
export function resumenDeConceptosElegidos(elegidos: readonly string[]): string {
  if (!elegidos.length) return 'Todos';
  return elegidos.length === 1 ? '1 concepto' : `${elegidos.length} conceptos`;
}
