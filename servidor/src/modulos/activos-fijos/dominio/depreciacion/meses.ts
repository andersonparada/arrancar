/** Cuándo empieza a depreciarse un bien (variable de empresa `activos-fijos.depreciacion.primer_mes`, §3.6). */
export type PrimerMes = 'mes_de_inicio' | 'mes_siguiente';

/** El período de una fecha `aaaa-mm-dd`: el primer día de su mes. */
export const periodoDe = (fecha: string): string => `${fecha.slice(0, 7)}-01`;

/** El período que queda `meses` después de otro (`aaaa-mm-01`). */
export function sumarMeses(periodo: string, meses: number): string {
  const total = Number(periodo.slice(0, 4)) * 12 + (Number(periodo.slice(5, 7)) - 1) + meses;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

/** El primer mes que usa un tramo que nace en `fecha`: el mismo mes o el siguiente, según la regla (§7.1). */
export function primerMesDelTramo(fecha: string, regla: PrimerMes): string {
  const mes = periodoDe(fecha);
  return regla === 'mes_siguiente' ? sumarMeses(mes, 1) : mes;
}
