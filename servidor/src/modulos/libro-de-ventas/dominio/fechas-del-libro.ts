import { anioDe, fechaIso, sumarDias } from '../../core/calendario/dominio/fecha-iso.js';

/** Primer día del mes de una fecha: `2026-03-17` → `2026-03-01`. @throws FechaInvalida si no es una fecha. */
export function primerDiaDelMes(fecha: string): string {
  anioDe(fecha);
  return `${fecha.slice(0, 7)}-01`;
}

/** Primer día del mes que queda `meses` después del de la fecha: `2026-11-20` + 2 → `2027-01-01`. */
export function sumarMeses(fecha: string, meses: number): string {
  const indice = anioDe(fecha) * 12 + (Number(fecha.slice(5, 7)) - 1) + meses;
  return fechaIso(Math.floor(indice / 12), (indice % 12) + 1, 1);
}

/** El último día del mes de la fecha: `2026-02-10` → `2026-02-28`. */
export function ultimoDiaDelMes(fecha: string): string {
  return sumarDias(sumarMeses(fecha, 1), -1);
}

/** La misma fecha `meses` después, o el último día de ese mes si no existe: `2026-12-31` + 2 → `2027-02-28`. */
export function sumarMesesALaFecha(fecha: string, meses: number): string {
  const ultimo = ultimoDiaDelMes(sumarMeses(fecha, meses));
  const dia = Math.min(Number(fecha.slice(8, 10)), Number(ultimo.slice(8, 10)));
  return `${ultimo.slice(0, 8)}${String(dia).padStart(2, '0')}`;
}

/**
 * El último día incluido de un plazo en meses, contado de fecha a fecha como manda el Código Tributario: vence la
 * víspera del día que lleva el mismo número, `meses` después. Factura del 15/03 con 2 meses: en plazo hasta el 14/05
 * incluido. Si el mes final no tiene ese número (31 contra un mes de 30) vence el último día de ese mes.
 */
export function venceLaVispera(fecha: string, meses: number): string {
  const equivalente = sumarMesesALaFecha(fecha, meses);
  if (equivalente.slice(8, 10) !== fecha.slice(8, 10)) return equivalente;
  return sumarDias(equivalente, -1);
}
