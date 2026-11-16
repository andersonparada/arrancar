import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { AutorizacionDelReporte } from '../../servicios/tipos-de-reportes';
import { esFechaCompleta, sumarDias } from './fechas-de-reportes';

export type OrdenDeSaldos = 'nombre' | 'mayor_saldo';

/** Lo que se elige en R1; el proveedor vacío significa «todos». */
export interface FiltrosDeSaldos {
  corte: string;
  proveedorId: string;
  autorizacion: AutorizacionDelReporte;
  incluirSinSaldo: boolean;
  orden: OrdenDeSaldos;
}

export const OPCIONES_DE_AUTORIZACION: { valor: AutorizacionDelReporte; texto: string }[] = [
  { valor: 'todos', texto: 'Todos los documentos' },
  { valor: 'autorizados', texto: 'Solo autorizados' },
  { valor: 'sin_autorizar', texto: 'Solo sin autorizar' },
];

export const OPCIONES_DE_ORDEN: { valor: OrdenDeSaldos; texto: string }[] = [
  { valor: 'nombre', texto: 'Por nombre' },
  { valor: 'mayor_saldo', texto: 'Mayor saldo primero' },
];

export const filtrosDeSaldosIniciales = (hoy: string, proveedorId = '', corte = ''): FiltrosDeSaldos => ({
  corte: corte || hoy,
  proveedorId,
  autorizacion: 'todos',
  incluirSinSaldo: false,
  orden: 'nombre',
});

/** Lo que se manda al servidor: lo que quedó en «todos» o «no» no se manda. */
export function consultaDeSaldos(filtros: FiltrosDeSaldos): Consulta {
  return {
    corte: filtros.corte,
    proveedorId: filtros.proveedorId || undefined,
    autorizacion: filtros.autorizacion === 'todos' ? undefined : filtros.autorizacion,
    incluirSinSaldo: filtros.incluirSinSaldo || undefined,
    orden: filtros.orden === 'nombre' ? undefined : filtros.orden,
  };
}

/**
 * Por qué el corte no sirve, o `undefined` si sirve. El primer corte posible es el día anterior a la fecha de
 * inicio de la empresa (la regla es del servidor; aquí solo se avisa antes de pedirle algo que va a rechazar).
 */
export function errorDeCorte(corte: string, fechaDeInicio: string | null): string | undefined {
  if (!esFechaCompleta(corte)) return 'Escriba la fecha de corte completa.';
  if (!fechaDeInicio) return undefined;
  const primerCorte = sumarDias(fechaDeInicio, -1);
  if (corte >= primerCorte) return undefined;
  return `El corte no puede ser anterior al ${formatearFecha(primerCorte)}, el día antes de la fecha de inicio de la empresa.`;
}

/** Cuántos filtros se salen de lo que trae el reporte al abrir (para ofrecer «Quitar filtros»). */
export function cantidadDeFiltrosDeSaldos(filtros: FiltrosDeSaldos, hoy: string): number {
  const cambios = [
    filtros.corte !== hoy,
    !!filtros.proveedorId,
    filtros.autorizacion !== 'todos',
    filtros.incluirSinSaldo,
    filtros.orden !== 'nombre',
  ];
  return cambios.filter(Boolean).length;
}

/** Las líneas del encabezado impreso: qué corte y qué filtros dieron este papel. */
export function lineasDeImpresionDeSaldos(filtros: FiltrosDeSaldos, proveedor: string | null): string[] {
  const autorizacion = OPCIONES_DE_AUTORIZACION.find((o) => o.valor === filtros.autorizacion)?.texto ?? '';
  return [
    `Saldos al ${formatearFecha(filtros.corte)}`,
    `Proveedor: ${proveedor ?? 'todos'}`,
    `Documentos: ${autorizacion}`,
    filtros.incluirSinSaldo ? 'Incluye proveedores sin saldo' : '',
  ].filter(Boolean);
}
