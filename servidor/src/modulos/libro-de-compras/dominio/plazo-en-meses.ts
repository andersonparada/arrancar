import { sumarMesesALaFecha } from './periodo-del-libro.js';

const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

/**
 * El último día incluido de un plazo en meses, contado de fecha a fecha como manda el Código Tributario: el plazo
 * vence la víspera del día que lleva el mismo número, `meses` después. Factura del 15/03 con 2 meses: en plazo hasta
 * el 14/05 incluido; el 15/05 ya pasó. Si el mes final no tiene ese número (31 contra un mes de 30, o el 29 al 31
 * contra febrero) no hay día del cual tomar la víspera y vence el último día de ese mes: 31/12 + 2 meses → 28/02.
 * La usan la nota de crédito tardía y, más adelante, la nota de débito.
 * @param fecha `AAAA-MM-DD`.
 */
export function venceLaVispera(fecha: string, meses: number): string {
  const equivalente = sumarMesesALaFecha(fecha, meses);
  if (equivalente.slice(8, 10) !== fecha.slice(8, 10)) return equivalente;
  const vispera = new Date(`${equivalente}T00:00:00Z`).getTime() - UN_DIA_EN_MS;
  return new Date(vispera).toISOString().slice(0, 10);
}
