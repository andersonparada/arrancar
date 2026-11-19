import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { esFechaCompleta, primerDiaDelMes } from './fechas-de-reportes';

/** Los reportes «al corte» (CC-R1 y CC-R4): una fecha de corte y, si se quiere, un solo fondo. */
export interface FiltrosAlCorte {
  corte: string;
  /** Vacío: todos los fondos que el usuario ve. */
  fondoId: string;
}

/** Los reportes «del período» (CC-R2, CC-R3 y CC-R5): desde, hasta y, si se quiere, un solo fondo. */
export interface FiltrosDePeriodo {
  desde: string;
  hasta: string;
  fondoId: string;
}

export const filtrosAlCorteIniciales = (hoy: string): FiltrosAlCorte => ({ corte: hoy, fondoId: '' });

/** El mes de hoy hasta hoy, como lo propone el servidor. */
export const filtrosDePeriodoIniciales = (hoy: string): FiltrosDePeriodo => ({
  desde: primerDiaDelMes(hoy),
  hasta: hoy,
  fondoId: '',
});

export const consultaAlCorte = (filtros: FiltrosAlCorte): Consulta => ({
  corte: filtros.corte,
  fondoId: filtros.fondoId || undefined,
});

export const consultaDePeriodo = (filtros: FiltrosDePeriodo): Consulta => ({
  desde: filtros.desde,
  hasta: filtros.hasta,
  fondoId: filtros.fondoId || undefined,
});

/** Qué está mal del corte, o nada si se puede pedir el reporte. */
export function erroresDelCorte(filtros: FiltrosAlCorte): { corte?: string } {
  return esFechaCompleta(filtros.corte) ? {} : { corte: 'Escriba la fecha completa.' };
}

/** Qué está mal del período, o nada si se puede pedir el reporte. */
export function erroresDelPeriodo(filtros: FiltrosDePeriodo): { desde?: string; hasta?: string } {
  const errores: { desde?: string; hasta?: string } = {};
  if (!esFechaCompleta(filtros.desde)) errores.desde = 'Escriba la fecha completa.';
  if (!esFechaCompleta(filtros.hasta)) errores.hasta = 'Escriba la fecha completa.';
  if (!errores.desde && !errores.hasta && filtros.desde > filtros.hasta) {
    errores.desde = 'La fecha «desde» no puede ser posterior a «hasta».';
  }
  return errores;
}

const contar = (cambios: boolean[]): number => cambios.filter(Boolean).length;

export function cantidadDeFiltrosAlCorte(filtros: FiltrosAlCorte, hoy: string): number {
  return contar([filtros.corte !== hoy, filtros.fondoId !== '']);
}

export function cantidadDeFiltrosDePeriodo(filtros: FiltrosDePeriodo, hoy: string): number {
  const inicial = filtrosDePeriodoIniciales(hoy);
  return contar([filtros.desde !== inicial.desde, filtros.hasta !== inicial.hasta, filtros.fondoId !== '']);
}

const lineaDelFondo = (nombre: string | undefined): string => `Fondo: ${nombre ?? 'todos los que puede ver'}`;

/** Las líneas del encabezado impreso de un reporte al corte. */
export const lineasDeImpresionAlCorte = (filtros: FiltrosAlCorte, nombreDelFondo?: string): string[] => [
  `Al corte del ${formatearFecha(filtros.corte)}`,
  lineaDelFondo(filtros.fondoId ? nombreDelFondo : undefined),
];

/** Las líneas del encabezado impreso de un reporte de un período. */
export const lineasDeImpresionDePeriodo = (filtros: FiltrosDePeriodo, nombreDelFondo?: string): string[] => [
  `Del ${formatearFecha(filtros.desde)} al ${formatearFecha(filtros.hasta)}`,
  lineaDelFondo(filtros.fondoId ? nombreDelFondo : undefined),
];
