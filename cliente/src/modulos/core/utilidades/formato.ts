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

/** Monto con símbolo de moneda. Recibe texto para no perder precisión en decimales. */
export function formatearMonto(valor: string | number | null | undefined, moneda = 'GTQ'): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda }).format(Number(valor));
}
