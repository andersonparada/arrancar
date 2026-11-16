import type { CalendarioLaboral } from '../calendario-laboral.js';
import { fechaLimiteDeEntero } from '../plazo-de-entero.js';
import type { ImpuestoRetenido } from '../retencion-propuesta.js';

/** Días hábiles para entregar la constancia del ISR retenido (Código Tributario art. 8 num. 4). */
export const DIAS_HABILES_DE_LA_CONSTANCIA_ISR = 5;

/** Lo que se dice del IVA: su plazo propio no está confirmado y se guía por el del entero. */
export const SIN_PLAZO_PROPIO_DE_LA_CONSTANCIA = 'Sin plazo propio confirmado';

export interface DatosDelPlazoDeLaConstancia {
  impuesto: ImpuestoRetenido;
  fechaDeLaRetencion: string;
  calendario: CalendarioLaboral;
}

/**
 * Último día para entregar la constancia de una retención: en el ISR, el quinto día hábil del mes siguiente a la fecha
 * de la retención (el calendario corre al siguiente hábil lo que caiga en feriado); en el IVA, `null` (sin plazo propio).
 */
export function plazoDeLaConstancia(datos: DatosDelPlazoDeLaConstancia): string | null {
  if (datos.impuesto !== 'isr') return null;
  return fechaLimiteDeEntero({
    fechaDeLaRetencion: datos.fechaDeLaRetencion,
    diasHabiles: DIAS_HABILES_DE_LA_CONSTANCIA_ISR,
    calendario: datos.calendario,
  });
}

const DIA_EN_MILISEGUNDOS = 24 * 60 * 60 * 1000;

/** Días de calendario que faltan de `hoy` a `limite` (negativo si ya pasó); ambos `AAAA-MM-DD`. */
export function diasHasta(hoy: string, limite: string): number {
  return Math.round((Date.parse(`${limite}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / DIA_EN_MILISEGUNDOS);
}
