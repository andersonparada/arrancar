/** `AAAA-MM-DD` → `dd/mm/aaaa`, como se lee en pantalla y en los avisos. */
export function fechaLegible(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** El último día del mes (`AAAA-MM-DD`) de una fecha. */
export function ultimoDiaDelMesDe(fecha: string): string {
  const dia = new Date(Date.UTC(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)), 0)).getUTCDate();
  return `${fecha.slice(0, 8)}${String(dia).padStart(2, '0')}`;
}
