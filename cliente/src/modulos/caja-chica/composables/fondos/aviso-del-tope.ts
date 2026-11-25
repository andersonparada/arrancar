import { centavosDe } from '../dinero';

export const AVISO_DEL_TOPE =
  'El tope es mayor que el fondo y no tendrá efecto: ningún comprobante puede pasar del efectivo.';

/**
 * El aviso cuando el tope por comprobante escrito es mayor que el monto del fondo. Se acepta (es política interna y el
 * fondo puede aumentarse), pero no tendrá efecto: se dice antes de guardar. Sin aviso si falta alguno de los dos.
 */
export function avisoDelTope(tope: string | number | null, monto: string | number | null): string | null {
  const centavosDelTope = centavosDe(tope ?? '');
  const centavosDelMonto = centavosDe(monto ?? '');
  if (centavosDelTope === null || centavosDelMonto === null || centavosDelMonto === 0) return null;
  return centavosDelTope > centavosDelMonto ? AVISO_DEL_TOPE : null;
}
