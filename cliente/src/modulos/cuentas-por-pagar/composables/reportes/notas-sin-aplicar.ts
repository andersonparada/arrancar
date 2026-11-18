import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FilaDeNotaSinAplicar, ReporteDeNotasSinAplicar } from '../../servicios/tipos-de-reportes-de-efectivo';
import { esFechaCompleta, primerDiaDelMes, sumarDias } from './fechas-de-reportes';
import type { TotalDelReporte } from './resumen-de-reportes';

export interface FiltrosDeNotas {
  corte: string;
  cuentaBancariaId: string;
}

export interface CuentaConocida {
  id: string;
  nombre: string;
}

/** Por omisión, el fin del mes anterior: la transitoria se cuadra al cerrar. */
export const finDelMesAnterior = (hoy: string): string => sumarDias(primerDiaDelMes(hoy), -1);

export const filtrosDeNotasIniciales = (hoy: string, corte = ''): FiltrosDeNotas => ({
  corte: corte || finDelMesAnterior(hoy),
  cuentaBancariaId: '',
});

export const consultaDeNotas = (filtros: FiltrosDeNotas): Consulta => ({
  corte: filtros.corte,
  cuentaBancariaId: filtros.cuentaBancariaId || undefined,
});

export const errorDeCorteDeNotas = (corte: string): string | undefined =>
  esFechaCompleta(corte) ? undefined : 'Escriba la fecha de corte completa.';

export const cantidadDeFiltrosDeNotas = (filtros: FiltrosDeNotas, hoy: string): number =>
  [filtros.corte !== finDelMesAnterior(hoy), !!filtros.cuentaBancariaId].filter(Boolean).length;

/** Suma a las cuentas ya vistas las del reporte (una cuenta filtrada no debe desaparecer del selector), por nombre. */
export function unirCuentas(conocidas: CuentaConocida[], filas: FilaDeNotaSinAplicar[]): CuentaConocida[] {
  const porId = new Map(conocidas.map((c) => [c.id, c]));
  for (const fila of filas) porId.set(fila.cuentaBancariaId, { id: fila.cuentaBancariaId, nombre: fila.cuenta });
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

export const opcionesDeCuentas = (cuentas: CuentaConocida[]): { valor: string; texto: string }[] => [
  { valor: '', texto: 'Todas las cuentas' },
  ...cuentas.map((c) => ({ valor: c.id, texto: c.nombre })),
];

export const textoDeDiasSinAplicar = (dias: number): string => (dias === 1 ? '1 día' : `${Math.max(dias, 0)} días`);

export const textoDeConciliada = (conciliada: boolean): string => (conciliada ? 'Conciliada' : 'Sin conciliar');

/** Las cifras de arriba de R11: la primera es el saldo de la transitoria «Pagos a proveedores por aplicar». */
export function totalesDeNotas({ total }: ReporteDeNotasSinAplicar): TotalDelReporte[] {
  return [
    { etiqueta: 'Por aplicar (saldo de la transitoria)', valor: formatearMonto(total.disponible), destacado: true },
    { etiqueta: total.cantidad === 1 ? 'Nota' : 'Notas', valor: String(total.cantidad) },
    { etiqueta: 'Monto de las notas', valor: formatearMonto(total.monto) },
    { etiqueta: 'Ya aplicado', valor: formatearMonto(total.aplicado) },
  ];
}

export const lineasDeImpresionDeNotas = (filtros: FiltrosDeNotas, cuenta: string | null): string[] => [
  `Notas de débito para proveedores sin aplicar al ${formatearFecha(filtros.corte)}`,
  `Cuenta: ${cuenta ?? 'todas'}`,
];
