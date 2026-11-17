import { sumarDias, ultimoDiaDelMes } from './fechas-de-corte.js';

/** El mes como lo pide un reporte: `AAAA-MM`. */
export type MesDeReporte = string;

/** El mes anterior al de una fecha `AAAA-MM-DD`. */
export function mesAnteriorDe(fecha: string): MesDeReporte {
  const [anio = 0, mes = 1] = fecha.split('-').map(Number);
  const anterior = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  return `${String(anterior.anio).padStart(4, '0')}-${String(anterior.mes).padStart(2, '0')}`;
}

/** El primero y el último día de un mes `AAAA-MM`. */
export function limitesDelMes(mes: MesDeReporte): { desde: string; hasta: string } {
  const [anio = 0, numero = 1] = mes.split('-').map(Number);
  return { desde: `${mes}-01`, hasta: ultimoDiaDelMes(anio, numero) };
}

/**
 * El primer día de la semana de vencimiento de un cheque: las semanas cuentan desde el día siguiente al corte, de siete
 * en siete (la primera va del corte + 1 al corte + 7).
 */
export function inicioDeSemanaDeVencimiento(corte: string, fecha: string): string {
  const dias = Math.round((Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${corte}T00:00:00Z`)) / 86_400_000);
  return sumarDias(corte, 1 + Math.floor((dias - 1) / 7) * 7);
}
