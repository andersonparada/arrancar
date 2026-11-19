/** La fecha de hoy (`AAAA-MM-DD`) en la zona horaria de la empresa; `ahora` se fija en las pruebas. */
export function fechaDeHoyEn(zonaHoraria: string, ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}
