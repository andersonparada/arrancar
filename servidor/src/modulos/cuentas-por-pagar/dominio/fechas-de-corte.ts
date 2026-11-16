/**
 * Aritmética de fechas `AAAA-MM-DD` para los reportes con fecha de corte. Todo en UTC: una fecha sin hora no cambia con
 * la zona horaria.
 */

const MILISEGUNDOS_POR_DIA = 86_400_000;

const aInstante = (fecha: string): number => Date.parse(`${fecha}T00:00:00Z`);

/** Los días de `desde` a `hasta` (positivo si `hasta` es posterior). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aInstante(hasta) - aInstante(desde)) / MILISEGUNDOS_POR_DIA);
}

/** La fecha `dias` después de `fecha` (o antes, si es negativo). */
export function sumarDias(fecha: string, dias: number): string {
  return new Date(aInstante(fecha) + dias * MILISEGUNDOS_POR_DIA).toISOString().slice(0, 10);
}

/** El último día del mes `mes` (1 a 12) del año `anio`. */
export function ultimoDiaDelMes(anio: number, mes: number): string {
  return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
}

const conCeros = (numero: number, largo: number): string => String(numero).padStart(largo, '0');

/** La misma fecha con `anios` años más (el 29 de febrero pasa al 28 si el año destino no es bisiesto). */
export function sumarAnios(fecha: string, anios: number): string {
  const [anio = 0, mes = 1, dia = 1] = fecha.split('-').map(Number);
  const ultimo = Number(ultimoDiaDelMes(anio + anios, mes).slice(8));
  return `${conCeros(anio + anios, 4)}-${conCeros(mes, 2)}-${conCeros(Math.min(dia, ultimo), 2)}`;
}
