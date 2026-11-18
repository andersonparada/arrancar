import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  FilaDeRetiroPorLiquidar,
  ReporteDeRetirosPorLiquidar,
} from '../../servicios/tipos-de-reportes-de-efectivo';
import { esFechaCompleta } from './fechas-de-reportes';
import type { TotalDelReporte } from './resumen-de-reportes';

export interface FiltrosDeRetiros {
  corte: string;
  custodio: string;
}

export const filtrosDeRetirosIniciales = (hoy: string, corte = ''): FiltrosDeRetiros => ({
  corte: corte || hoy,
  custodio: '',
});

export const consultaDeRetiros = (filtros: FiltrosDeRetiros): Consulta => ({
  corte: filtros.corte,
  custodio: filtros.custodio.trim() || undefined,
});

export const errorDeCorteDeRetiros = (corte: string): string | undefined =>
  esFechaCompleta(corte) ? undefined : 'Escriba la fecha de corte completa.';

export const cantidadDeFiltrosDeRetiros = (filtros: FiltrosDeRetiros, hoy: string): number =>
  [filtros.corte !== hoy, filtros.custodio.trim() !== ''].filter(Boolean).length;

export const textoDeFormaDeRetiro = (forma: FilaDeRetiroPorLiquidar['forma']): string =>
  forma === 'cheque' ? 'Cheque' : 'Nota de débito';

/** «Hoy», «1 día» o «45 días» desde que se entregó el efectivo. */
export function textoDeDiasAbierto(dias: number): string {
  if (dias <= 0) return 'Hoy';
  return dias === 1 ? '1 día' : `${dias} días`;
}

/** Las cifras de arriba de R10: la primera es lo que tiene la caja de efectivo para pagos a proveedores. */
export function totalesDeRetiros({ total, filas }: ReporteDeRetirosPorLiquidar): TotalDelReporte[] {
  const deMesAnterior = filas.filter((f) => f.deMesAnterior).length;
  return [
    { etiqueta: 'Efectivo en manos de custodios', valor: formatearMonto(total.disponible), destacado: true },
    { etiqueta: total.cantidad === 1 ? 'Retiro abierto' : 'Retiros abiertos', valor: String(total.cantidad) },
    { etiqueta: 'Retirado', valor: formatearMonto(total.monto) },
    { etiqueta: 'Pagado a proveedores', valor: formatearMonto(total.pagado) },
    { etiqueta: 'De un mes anterior', valor: String(deMesAnterior) },
  ];
}

export const lineasDeImpresionDeRetiros = (filtros: FiltrosDeRetiros): string[] => [
  `Retiros de efectivo por liquidar al ${formatearFecha(filtros.corte)}`,
  `Custodio: ${filtros.custodio.trim() || 'todos'}`,
];
