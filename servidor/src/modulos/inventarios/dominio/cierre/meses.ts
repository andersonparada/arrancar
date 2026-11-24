/** El primer día del mes de una fecha (`aaaa-mm-dd` → `aaaa-mm-01`): así se identifica un mes del cierre. */
export const primerDiaDelMes = (fecha: string): string => `${fecha.slice(0, 7)}-01`;

/** El primer día del mes que está `meses` meses después (o antes, con negativos) del de `periodo`. */
export function sumarMeses(periodo: string, meses: number): string {
  const anio = Number(periodo.slice(0, 4));
  const mes = Number(periodo.slice(5, 7));
  return new Date(Date.UTC(anio, mes - 1 + meses, 1)).toISOString().slice(0, 10);
}

/** El último día del mes de `periodo`: hasta ahí llegan los movimientos que entran en su foto. */
export function ultimoDiaDelMes(periodo: string): string {
  const anio = Number(periodo.slice(0, 4));
  const mes = Number(periodo.slice(5, 7));
  return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
}
