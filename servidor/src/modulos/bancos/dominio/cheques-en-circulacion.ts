const MILISEGUNDOS_POR_DIA = 86_400_000;

/** Mínimo razonable de la variable `bancos.cheques.meses_de_vencimiento`. */
export const MESES_MINIMOS_DE_VENCIMIENTO = 1;
export const MESES_MAXIMOS_DE_VENCIMIENTO = 120;
export const MESES_DE_VENCIMIENTO_POR_OMISION = 7;

const aFechaUtc = (fecha: string): Date => new Date(`${fecha}T00:00:00Z`);
const aTexto = (fecha: Date): string => fecha.toISOString().slice(0, 10);
const diasDelMes = (anio: number, mes: number): number => new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();

/**
 * La fecha límite para ser caduco: `hoy` menos `meses`, con el día recortado al fin de mes si hace falta
 * (igual que `current_date - make_interval(months => n)` de PostgreSQL). Un cheque es caduco si su
 * fecha es **anterior** a esta.
 */
export function fechaDeCorteDeCheques(hoy: string, meses: number): string {
  const base = aFechaUtc(hoy);
  const indiceDeMes = base.getUTCFullYear() * 12 + base.getUTCMonth() - meses;
  const anio = Math.floor(indiceDeMes / 12);
  const mes = indiceDeMes - anio * 12;
  const dia = Math.min(base.getUTCDate(), diasDelMes(anio, mes));
  return aTexto(new Date(Date.UTC(anio, mes, dia)));
}

/** Los días completos que pasaron desde la fecha del cheque hasta hoy (0 si es de hoy o futura). */
export function diasDeAntiguedad(fecha: string, hoy: string): number {
  const dias = Math.round((aFechaUtc(hoy).getTime() - aFechaUtc(fecha).getTime()) / MILISEGUNDOS_POR_DIA);
  return Math.max(dias, 0);
}
