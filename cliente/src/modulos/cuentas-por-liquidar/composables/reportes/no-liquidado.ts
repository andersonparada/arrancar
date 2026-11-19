import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { DestinoDeNoLiquidado } from '../../servicios/tipos-de-reportes';
import { esFechaCompleta, primerDiaDelMes } from './fechas-de-reportes';

export interface FiltrosDeNoLiquidado {
  desde: string;
  hasta: string;
  /** Vacío: los tres destinos. */
  destino: DestinoDeNoLiquidado | '';
}

export const OPCIONES_DE_DESTINO: Array<{ valor: DestinoDeNoLiquidado | ''; texto: string }> = [
  { valor: '', texto: 'Todos los destinos' },
  { valor: 'cobrar', texto: 'Por cobrar en cuotas' },
  { valor: 'renta_del_trabajo', texto: 'Renta del trabajo' },
  { valor: 'perdida', texto: 'Pérdida' },
];

/** El mes de hoy hasta hoy, como lo propone el servidor. */
export const filtrosDeNoLiquidadoIniciales = (hoy: string): FiltrosDeNoLiquidado => ({
  desde: primerDiaDelMes(hoy),
  hasta: hoy,
  destino: '',
});

export const consultaDeNoLiquidado = (filtros: FiltrosDeNoLiquidado): Consulta => ({
  desde: filtros.desde,
  hasta: filtros.hasta,
  destino: filtros.destino || undefined,
});

/** Qué está mal del período, o nada si se puede pedir el reporte. */
export function errorDelPeriodo(filtros: FiltrosDeNoLiquidado): { desde?: string; hasta?: string } {
  const errores: { desde?: string; hasta?: string } = {};
  if (!esFechaCompleta(filtros.desde)) errores.desde = 'Escriba la fecha completa.';
  if (!esFechaCompleta(filtros.hasta)) errores.hasta = 'Escriba la fecha completa.';
  if (!errores.desde && !errores.hasta && filtros.desde > filtros.hasta) {
    errores.desde = 'La fecha «desde» no puede ser posterior a «hasta».';
  }
  return errores;
}

export const cantidadDeFiltrosDeNoLiquidado = (filtros: FiltrosDeNoLiquidado, hoy: string): number => {
  const inicial = filtrosDeNoLiquidadoIniciales(hoy);
  return [filtros.desde !== inicial.desde, filtros.hasta !== inicial.hasta, filtros.destino !== ''].filter(Boolean)
    .length;
};

/** «6 cuotas» o nada si no se cobra en cuotas. */
export const textoDeCuotas = (cuotas: number | null): string =>
  cuotas === null ? '' : cuotas === 1 ? '1 cuota' : `${cuotas} cuotas`;

export const lineasDeImpresionDeNoLiquidado = (filtros: FiltrosDeNoLiquidado): string[] => [
  `Lo no liquidado del ${formatearFecha(filtros.desde)} al ${formatearFecha(filtros.hasta)}`,
  `Destino: ${OPCIONES_DE_DESTINO.find((o) => o.valor === filtros.destino)?.texto ?? 'todos'}`,
];
