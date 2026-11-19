/** Aritmética de fechas `AAAA-MM-DD` en UTC: una fecha sin hora no cambia con la zona horaria. */

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

/** `AAAA-MM-DD` como `dd/mm/aaaa`, para los mensajes. */
export function fechaLegible(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}
