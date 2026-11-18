/** Cómo se acotan las notas ya registradas: por cuenta bancaria y por el rango de fechas de la nota. */
export interface FiltroDeNotas {
  cuentaBancariaId: string;
  desde: string;
  hasta: string;
}

export const filtroDeNotasVacio = (): FiltroDeNotas => ({ cuentaBancariaId: '', desde: '', hasta: '' });

/** Lo que se manda al servidor: solo los campos con valor. */
export function consultaDeNotas(filtro: FiltroDeNotas): Record<string, string> {
  const consulta: Record<string, string> = {};
  if (filtro.cuentaBancariaId) consulta.cuentaBancariaId = filtro.cuentaBancariaId;
  if (filtro.desde) consulta.desde = filtro.desde;
  if (filtro.hasta) consulta.hasta = filtro.hasta;
  return consulta;
}

export const hayFiltroDeNotas = (filtro: FiltroDeNotas): boolean => Object.keys(consultaDeNotas(filtro)).length > 0;

/** Un mensaje si el rango está al revés (así no se pide al servidor algo que no puede dar); `null` si está bien. */
export function errorDelRangoDeNotas({ desde, hasta }: FiltroDeNotas): string | null {
  return desde && hasta && desde > hasta ? 'La fecha «Desde» no puede ser posterior a «Hasta».' : null;
}

/** El texto cuando la lista llega al tope del servidor y podría haber más notas. */
export const TEXTO_DE_NOTAS_AL_TOPE = 'Hay más notas: filtre por cuenta o por fechas.';

/** Si la nota elegida ya no está en la lista (porque se filtró), hay que soltarla. */
export const notaSigueEnLista = (movimientoId: string, notas: readonly { movimientoId: string }[]): boolean =>
  !movimientoId || notas.some((nota) => nota.movimientoId === movimientoId);
