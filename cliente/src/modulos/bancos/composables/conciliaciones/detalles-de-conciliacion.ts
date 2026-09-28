import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { ConciliacionResumen, EstadoDeConciliacion } from '../../servicios/conciliaciones.api';

const NOMBRE_DEL_MES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const TEXTO_DEL_ESTADO: Record<EstadoDeConciliacion, string> = {
  en_proceso: 'En proceso',
  elaborada: 'Elaborada',
  autorizada: 'Autorizada',
};

/** El periodo legible de una conciliación: "Enero 2026". */
export function periodoDeConciliacion(registro: Pick<ConciliacionResumen, 'anio' | 'mes'>): string {
  const nombre = NOMBRE_DEL_MES[registro.mes - 1] ?? String(registro.mes);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${registro.anio}`;
}

/** Lo que muestra la tarjeta de una conciliación en la lista de la cuenta. */
export function detallesDeConciliacion(registro: ConciliacionResumen): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [];
  if (registro.elaboradaEn) detalles.push({ etiqueta: 'Elaborada', valor: formatearFecha(registro.elaboradaEn) });
  if (registro.autorizadaEn) detalles.push({ etiqueta: 'Autorizada', valor: formatearFecha(registro.autorizadaEn) });
  return detalles;
}
