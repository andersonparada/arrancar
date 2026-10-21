const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

/** Lo que decide cuándo vence un cargo. */
export interface DatosDelPlazo {
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
  /** Los días de crédito del proveedor; `null` si no tiene (se usa el plazo por omisión), `0` es contado. */
  diasDeCredito: number | null;
  /** Los meses de crédito por omisión de la empresa (0 es contado). */
  mesesPorOmision: number;
}

/** La fecha `AAAA-MM-DD` que cae `meses` después; si ese mes no tiene el día, el último de ese mes (31-ene → 28-feb). */
export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  const primeroDelMes = Date.UTC(anio, mes - 1 + meses, 1);
  const destino = new Date(primeroDelMes);
  const ultimoDia = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(dia, ultimoDia));
  return destino.toISOString().slice(0, 10);
}

/** La fecha `AAAA-MM-DD` que cae `dias` después. */
export function sumarDias(fecha: string, dias: number): string {
  return new Date(new Date(`${fecha}T00:00:00Z`).getTime() + dias * UN_DIA_EN_MS).toISOString().slice(0, 10);
}

/**
 * El vencimiento que se propone al recibir un cargo: la fecha de emisión más los días de crédito del proveedor; sin
 * ese dato, la fecha de emisión más los meses por omisión de la empresa (un mes calendario si nadie lo cambió).
 */
export function proponerVencimiento({ fechaEmision, diasDeCredito, mesesPorOmision }: DatosDelPlazo): string {
  if (diasDeCredito !== null) return sumarDias(fechaEmision, diasDeCredito);
  return sumarMeses(fechaEmision, mesesPorOmision);
}
