import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ConciliacionResumen } from '../../servicios/conciliaciones.api';

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

/** El periodo legible de una conciliación: "Enero 2026". */
export function periodoDeConciliacion(registro: Pick<ConciliacionResumen, 'anio' | 'mes'>): string {
  const nombre = NOMBRE_DEL_MES[registro.mes - 1] ?? String(registro.mes);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${registro.anio}`;
}

/** Lo que muestra la tarjeta de una conciliación en la lista de la cuenta. */
export function detallesDeConciliacion(registro: ConciliacionResumen): DetalleDeRegistro[] {
  return [{ etiqueta: 'Saldo según banco', valor: formatearMonto(registro.saldoSegunBanco) }];
}
