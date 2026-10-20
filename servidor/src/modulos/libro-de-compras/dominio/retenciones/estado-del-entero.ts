export const ESTADOS_DEL_ENTERO = ['sin_retenciones', 'pendiente', 'vencido', 'enterado', 'con_diferencia'] as const;
export type EstadoDelEntero = (typeof ESTADOS_DEL_ENTERO)[number];

export interface DatosDelEstadoDelEntero {
  /** Retenido del mes y grupo en documentos vigentes, en centavos. */
  retenido: number;
  /** Suma de los pagos vigentes, en centavos. */
  pagado: number;
  hoy: string;
  /** Último día del plazo. */
  limite: string;
}

/**
 * El estado de un mes y grupo: sin retenciones; pendiente (en plazo) o vencido si no hay pagos; enterado si lo pagado
 * es lo retenido; con diferencia si es otra cosa (un documento anulado o registrado después de pagar).
 */
export function estadoDelEntero({ retenido, pagado, hoy, limite }: DatosDelEstadoDelEntero): EstadoDelEntero {
  if (retenido === 0 && pagado === 0) return 'sin_retenciones';
  if (pagado === 0) return hoy > limite ? 'vencido' : 'pendiente';
  return pagado === retenido ? 'enterado' : 'con_diferencia';
}
