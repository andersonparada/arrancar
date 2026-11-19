import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FilaDeChequePosfechado, ReporteDeChequesPosfechados } from '../../servicios/tipos-de-reportes-de-pagos';
import { esFechaCompleta } from './fechas-de-reportes';
import type { TotalDelReporte } from './resumen-de-reportes';

export interface FiltrosDeChequesPosfechados {
  corte: string;
  proveedorId: string;
}

export const filtrosDeChequesIniciales = (hoy: string, proveedorId = '', corte = ''): FiltrosDeChequesPosfechados => ({
  corte: corte || hoy,
  proveedorId,
});

export const consultaDeCheques = (filtros: FiltrosDeChequesPosfechados): Consulta => ({
  corte: filtros.corte,
  proveedorId: filtros.proveedorId || undefined,
});

export const errorDeCorteDeCheques = (corte: string): string | undefined =>
  esFechaCompleta(corte) ? undefined : 'Escriba la fecha de corte completa.';

export const cantidadDeFiltrosDeCheques = (filtros: FiltrosDeChequesPosfechados, hoy: string): number =>
  [filtros.corte !== hoy, !!filtros.proveedorId].filter(Boolean).length;

/** «Hoy», «Mañana» o «En 12 días» según lo que falta para la fecha del cheque. */
export function textoDeDiasQueFaltan(dias: number): string {
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

/** Lo que dice la marca de un cheque que Bancos ya concilió, o «Sin cobrar» si no. */
export function textoDeCobro(fila: Pick<FilaDeChequePosfechado, 'cobrado' | 'cobradoEn'>): string {
  if (!fila.cobrado) return 'Sin cobrar';
  return fila.cobradoEn ? `Cobrado en ${fila.cobradoEn}` : 'Cobrado a la vista';
}

/** Las cifras de arriba de R7: la primera es el «Comprometido» de R1. */
export function totalesDeCheques({ total, filas }: ReporteDeChequesPosfechados): TotalDelReporte[] {
  const cobrados = filas.filter((f) => f.cobrado).length;
  return [
    { etiqueta: 'Comprometido en cheques posfechados', valor: formatearMonto(total.monto), destacado: true },
    { etiqueta: total.cantidad === 1 ? 'Cheque' : 'Cheques', valor: String(total.cantidad) },
    { etiqueta: 'Ya cobrados a la vista', valor: String(cobrados) },
  ];
}

export const lineasDeImpresionDeCheques = (
  filtros: FiltrosDeChequesPosfechados,
  proveedor: string | null,
): string[] => [`Cheques posfechados al ${formatearFecha(filtros.corte)}`, `Proveedor: ${proveedor ?? 'todos'}`];
