import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeBancarizacion } from '../../servicios/tipos-de-reportes-de-efectivo';
import { mesAntesDe, textoDeMes } from './ajustes-del-mes';
import type { TotalDelReporte } from './resumen-de-reportes';

/** Lo que la SAT puede revisar (Código Tributario art. 47): el servidor rechaza más. */
export const MAXIMO_DE_MESES = 48;
const MESES_QUE_SE_OFRECEN = 60;
const MESES_POR_OMISION = 12;

export interface FiltrosDeBancarizacion {
  /** `AAAA-MM`. */
  desde: string;
  hasta: string;
  proveedorId: string;
  soloConEfecto: boolean;
}

/** Por omisión, los últimos 12 meses (con el actual), solo lo que tiene efecto fiscal. */
export const filtrosDeBancarizacionIniciales = (hoy: string, proveedorId = ''): FiltrosDeBancarizacion => ({
  desde: mesAntesDe(hoy, MESES_POR_OMISION - 1),
  hasta: mesAntesDe(hoy, 0),
  proveedorId,
  soloConEfecto: true,
});

export const consultaDeBancarizacion = (filtros: FiltrosDeBancarizacion): Consulta => ({
  desde: filtros.desde,
  hasta: filtros.hasta,
  proveedorId: filtros.proveedorId || undefined,
  soloConEfecto: filtros.soloConEfecto,
});

const numeroDeMes = (mes: string): number => {
  const [anio, numero] = mes.split('-').map(Number) as [number, number];
  return anio * 12 + numero;
};

/** Cuántos meses abarca el rango, ambos incluidos. */
export const mesesDelRango = (desde: string, hasta: string): number => numeroDeMes(hasta) - numeroDeMes(desde) + 1;

/** Lo que el servidor rechazaría, dicho antes y con la manera de corregirlo. */
export function errorDelRangoDeBancarizacion({ desde, hasta }: FiltrosDeBancarizacion): string | undefined {
  if (!desde || !hasta) return 'Escoja el mes inicial y el final.';
  const meses = mesesDelRango(desde, hasta);
  if (meses < 1) return 'El mes inicial no puede ser posterior al final: cambie uno de los dos.';
  if (meses > MAXIMO_DE_MESES) {
    return `El rango abarca ${meses} meses y el máximo es ${MAXIMO_DE_MESES} (lo que la SAT puede revisar): acórtelo.`;
  }
  return undefined;
}

export const cantidadDeFiltrosDeBancarizacion = (filtros: FiltrosDeBancarizacion, hoy: string): number => {
  const inicial = filtrosDeBancarizacionIniciales(hoy);
  return [
    filtros.desde !== inicial.desde,
    filtros.hasta !== inicial.hasta,
    !!filtros.proveedorId,
    !filtros.soloConEfecto,
  ].filter(Boolean).length;
};

/** Los últimos meses, del más reciente al más antiguo, para escoger sin escribir. */
export const opcionesDeMesesDeBancarizacion = (hoy: string): { valor: string; texto: string }[] =>
  Array.from({ length: MESES_QUE_SE_OFRECEN }, (_, i) => {
    const valor = mesAntesDe(hoy, i);
    return { valor, texto: textoDeMes(valor) };
  });

/** Las cifras de arriba de R9: lo que se pierde primero, luego el efectivo y el umbral con que se midió. */
export function totalesDeBancarizacion({ totales, umbral }: ReporteDeBancarizacion): TotalDelReporte[] {
  return [
    { etiqueta: 'Crédito fiscal en riesgo (IVA)', valor: formatearMonto(totales.total.ivaEnRiesgo), destacado: true },
    { etiqueta: 'Costo no deducible', valor: formatearMonto(totales.total.costoNoDeducible), destacado: true },
    { etiqueta: 'Efectivo en meses sobre el umbral', valor: formatearMonto(totales.meses.efectivo) },
    { etiqueta: 'Efectivo en documentos sobre el umbral', valor: formatearMonto(totales.documentos.efectivo) },
    { etiqueta: 'Umbral usado (el de hoy)', valor: formatearMonto(umbral) },
  ];
}

export const reporteDeBancarizacionVacio = (reporte: ReporteDeBancarizacion): boolean =>
  reporte.meses.length === 0 && reporte.documentosSobreElUmbral.length === 0;

/** Lo que se dice de un cargo cuyo IVA no se conoce (saldo inicial). */
export const notaDelCargo = (cargo: { ivaNoConocido: boolean }): string | null =>
  cargo.ivaNoConocido ? 'IVA no conocido (saldo inicial)' : null;

export const lineasDeImpresionDeBancarizacion = (
  filtros: FiltrosDeBancarizacion,
  proveedor: string | null,
): string[] => [
  `Pagos en efectivo sobre el umbral de bancarización, de ${textoDeMes(filtros.desde)} a ${textoDeMes(filtros.hasta)}`,
  `Proveedor: ${proveedor ?? 'todos'} · Solo con efecto fiscal: ${filtros.soloConEfecto ? 'sí' : 'no'}`,
];
