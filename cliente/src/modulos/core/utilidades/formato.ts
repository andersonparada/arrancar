import { usarSesion } from '../almacenes/sesion';

const ZONA_PREDETERMINADA = 'America/Guatemala';

/** Fecha y hora en la zona horaria configurada para la empresa, o "—" si no hay valor. */
export function formatearFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const zona = usarSesion().config('core.regional.zona_horaria', ZONA_PREDETERMINADA);
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: zona }).format(
    new Date(valor),
  );
}

const DIGITOS_DE_TELEFONO_LOCAL = 8;

/**
 * El servidor guarda los teléfonos sin separadores ("55551234"); los locales de
 * Guatemala se leen mejor en dos grupos ("5555-1234"). Los internacionales se
 * muestran tal cual.
 */
export function formatearTelefono(telefono: string | null | undefined): string {
  if (!telefono) return '';
  const esLocal = telefono.length === DIGITOS_DE_TELEFONO_LOCAL && /^\d+$/.test(telefono);
  return esLocal ? `${telefono.slice(0, 4)}-${telefono.slice(4)}` : telefono;
}

/** Monto con símbolo de moneda. Recibe texto para no perder precisión en decimales. */
export function formatearMonto(valor: string | number | null | undefined, moneda = 'GTQ'): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda }).format(Number(valor));
}
