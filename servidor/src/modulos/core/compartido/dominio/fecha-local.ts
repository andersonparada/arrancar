/** La zona horaria que se usa cuando la empresa no configura otra. */
export const ZONA_HORARIA_POR_OMISION = 'America/Guatemala';

/**
 * La fecha (`AAAA-MM-DD`) que marca el reloj de pared de `zonaHoraria` en el `instante` dado.
 * A diferencia de `toISOString()`, que siempre dice la fecha en UTC, aquí las 20:00 de Guatemala
 * siguen siendo el mismo día aunque en UTC ya sea el siguiente.
 * @throws RangeError si la zona horaria no existe.
 */
export function fechaLocalEn(instante: Date, zonaHoraria: string): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instante);
  const valorDe = (tipo: string): string => partes.find((parte) => parte.type === tipo)?.value ?? '';
  return `${valorDe('year')}-${valorDe('month')}-${valorDe('day')}`;
}
