import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { ClaseDeAnticipo } from '../../servicios/tipos-de-reportes';
import { esFechaCompleta } from './fechas-de-reportes';

export interface FiltrosDeAnticiposPorLiquidar {
  corte: string;
  soloVencidos: boolean;
}

export const filtrosDeAnticiposIniciales = (hoy: string, corte = ''): FiltrosDeAnticiposPorLiquidar => ({
  corte: corte || hoy,
  soloVencidos: false,
});

export const consultaDeAnticipos = (filtros: FiltrosDeAnticiposPorLiquidar): Consulta => ({
  corte: filtros.corte,
  soloVencidos: filtros.soloVencidos ? 'true' : undefined,
});

export const errorDeCorteDeAnticipos = (corte: string): string | undefined =>
  esFechaCompleta(corte) ? undefined : 'Escriba la fecha de corte completa.';

export const cantidadDeFiltrosDeAnticipos = (filtros: FiltrosDeAnticiposPorLiquidar, hoy: string): number =>
  [filtros.corte !== hoy, filtros.soloVencidos].filter(Boolean).length;

const CLASES: Record<ClaseDeAnticipo, string> = { viatico: 'Viático', compra: 'Compra', otro: 'Otro' };

export const textoDeClaseDeAnticipo = (clase: ClaseDeAnticipo): string => CLASES[clase];

/** «Dentro del plazo», «Venció hace 1 día» o «Venció hace 45 días». */
export function textoDeVencimiento(diasVencido: number): string {
  if (diasVencido <= 0) return 'Dentro del plazo';
  return diasVencido === 1 ? 'Venció hace 1 día' : `Venció hace ${diasVencido} días`;
}

export const lineasDeImpresionDeAnticipos = (filtros: FiltrosDeAnticiposPorLiquidar): string[] => [
  `Anticipos por liquidar al ${formatearFecha(filtros.corte)}`,
  filtros.soloVencidos ? 'Solo los vencidos' : 'Todos los anticipos por liquidar',
];
