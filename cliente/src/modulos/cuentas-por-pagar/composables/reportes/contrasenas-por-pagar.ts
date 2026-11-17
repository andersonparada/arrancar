import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeContrasenasPorPagar } from '../../servicios/tipos-de-reportes-de-proveedor';
import { esFechaCompleta, sumarDias } from './fechas-de-reportes';
import type { TotalDelReporte } from './resumen-de-reportes';

export interface FiltrosDeContrasenasPorPagar {
  /** Hasta qué pago prometido se busca; por omisión, ayer. */
  pagoPrometidoHasta: string;
  proveedorId: string;
}

export const filtrosDeContrasenasIniciales = (hoy: string, proveedorId = ''): FiltrosDeContrasenasPorPagar => ({
  pagoPrometidoHasta: sumarDias(hoy, -1),
  proveedorId,
});

export const consultaDeContrasenas = (filtros: FiltrosDeContrasenasPorPagar): Consulta => ({
  pagoPrometidoHasta: filtros.pagoPrometidoHasta,
  proveedorId: filtros.proveedorId || undefined,
});

export const errorDeFechaPrometida = (fecha: string): string | undefined =>
  esFechaCompleta(fecha) ? undefined : 'Escriba la fecha completa.';

export const cantidadDeFiltrosDeContrasenas = (filtros: FiltrosDeContrasenasPorPagar, hoy: string): number =>
  [filtros.pagoPrometidoHasta !== sumarDias(hoy, -1), !!filtros.proveedorId].filter(Boolean).length;

/** «Vencida hace 5 días»; si el pago prometido aún no llega, lo dice. */
export function textoDeAtraso(dias: number): string {
  if (dias <= 0) return 'Aún no vence el pago prometido';
  return `Vencida hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** Las cifras de arriba de R5. */
export function totalesDeContrasenas({ totales }: ReporteDeContrasenasPorPagar): TotalDelReporte[] {
  return [
    { etiqueta: 'Saldo por pagar', valor: formatearMonto(totales.saldo), destacado: true },
    { etiqueta: totales.cantidad === 1 ? 'Contraseña' : 'Contraseñas', valor: String(totales.cantidad) },
    { etiqueta: 'Autorizado', valor: formatearMonto(totales.autorizado) },
    { etiqueta: 'Sin autorizar', valor: formatearMonto(totales.sinAutorizar) },
  ];
}

export const lineasDeImpresionDeContrasenas = (
  filtros: FiltrosDeContrasenasPorPagar,
  proveedor: string | null,
): string[] => [
  `Contraseñas con pago prometido hasta el ${formatearFecha(filtros.pagoPrometidoHasta)}`,
  `Proveedor: ${proveedor ?? 'todos'}`,
];
