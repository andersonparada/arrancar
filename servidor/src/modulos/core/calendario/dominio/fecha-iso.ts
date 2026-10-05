import { FechaInvalida } from './errores.js';

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_DIA = 86_400_000;

/** Una fecha `AAAA-MM-DD` como medianoche UTC, para sumar días sin que la zona horaria estorbe. */
function aUtc(fecha: string): Date {
  const partes = FORMATO.exec(fecha);
  if (!partes) throw new FechaInvalida(fecha);
  const instante = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
  if (instante.toISOString().slice(0, 10) !== fecha) throw new FechaInvalida(fecha);
  return instante;
}

/** Arma `AAAA-MM-DD` con ceros a la izquierda. */
export function fechaIso(anio: number, mes: number, dia: number): string {
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${String(anio).padStart(4, '0')}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

/** Día de la semana: 0 domingo, 1 lunes… 6 sábado. @throws FechaInvalida */
export function diaDeLaSemana(fecha: string): number {
  return aUtc(fecha).getUTCDay();
}

/** La fecha `dias` días después (o antes, si es negativo). @throws FechaInvalida */
export function sumarDias(fecha: string, dias: number): string {
  return new Date(aUtc(fecha).getTime() + dias * MS_POR_DIA).toISOString().slice(0, 10);
}

/** El año de una fecha válida. @throws FechaInvalida */
export function anioDe(fecha: string): number {
  return aUtc(fecha).getUTCFullYear();
}
