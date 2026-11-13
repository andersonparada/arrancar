/** Meses antes del mes de la fecha de inicio en que todavía cabe el crédito del IVA (art. 20). */
const MESES_DE_PLAZO_DE_CREDITO = 2;

/** Una fecha `AAAA-MM-DD` es anterior a la fecha de inicio de la empresa; sin fecha de inicio, ninguna lo es. */
export function esAnteriorALaFechaDeInicio(fechaDeEmision: string, fechaDeInicio: string | null): boolean {
  return fechaDeInicio !== null && fechaDeEmision < fechaDeInicio;
}

/** El primer día del mes que está dos meses antes del mes de la fecha de inicio (`AAAA-MM-01`). */
export function inicioDelPlazoDeCredito(fechaDeInicio: string): string {
  const anio = Number(fechaDeInicio.slice(0, 4));
  const mes = Number(fechaDeInicio.slice(5, 7)) - 1 - MESES_DE_PLAZO_DE_CREDITO;
  const anioResultante = anio + Math.floor(mes / 12);
  const mesResultante = ((mes % 12) + 12) % 12;
  return `${String(anioResultante).padStart(4, '0')}-${String(mesResultante + 1).padStart(2, '0')}-01`;
}

/**
 * Una fecha anterior a la fecha de inicio cuyo crédito todavía cabe: emitida en el mes de la fecha de inicio o en los dos
 * anteriores. Sirve para destacarla y pedir que se verifique que esté en el sistema anterior.
 */
export function estaEnPlazoDeCredito(fechaDeEmision: string, fechaDeInicio: string | null): boolean {
  if (fechaDeInicio === null || !esAnteriorALaFechaDeInicio(fechaDeEmision, fechaDeInicio)) return false;
  return fechaDeEmision >= inicioDelPlazoDeCredito(fechaDeInicio);
}
