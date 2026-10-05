import type { CalendarioLaboral } from './calendario-laboral.js';
import type { RetencionDeDocumento } from './documento-de-compra.js';
import { esEnteroVencido, fechaLimiteDeEntero, type PlazoDeEntero } from './plazo-de-entero.js';
import type { ImpuestoRetenido } from './retencion-propuesta.js';

export const AVISO_DE_RETENCION_QUITADA =
  'Quitó o rebajó una retención que la ley manda hacer: la empresa responde solidariamente por el impuesto no retenido (Código Tributario art. 29) y, si es ISR, el gasto puede no ser deducible (Decreto 10-2012 art. 22). Consulte a su contador.';

/** Lo que hace falta para saber si el plazo de entero ya venció. */
export interface ContextoDeEntero {
  /** La fecha de hoy en la zona horaria de la empresa. */
  hoy: string;
  diasHabilesIva: number;
  diasHabilesIsr: number;
  calendario: CalendarioLaboral;
}

const DESCRIPCION_DEL_IMPUESTO: Record<ImpuestoRetenido, string> = {
  iva: 'IVA',
  isr: 'ISR (se cuenta desde la fecha de la factura, Decreto 10-2012 art. 48)',
};

const diasDelImpuesto = (impuesto: ImpuestoRetenido, contexto: ContextoDeEntero): number =>
  impuesto === 'iva' ? contexto.diasHabilesIva : contexto.diasHabilesIsr;

function avisoDeEnteroVencido(impuesto: ImpuestoRetenido, limite: string): string {
  const [anio, mes, dia] = limite.split('-');
  return `El plazo para enterar la retención de ${DESCRIPCION_DEL_IMPUESTO[impuesto]} venció el ${dia}/${mes}/${anio}, o vence en los próximos días si hubo feriados; confírmelo.`;
}

const plazoDe = (retencion: RetencionDeDocumento, contexto: ContextoDeEntero): PlazoDeEntero => ({
  fechaDeLaRetencion: retencion.fecha,
  diasHabiles: diasDelImpuesto(retencion.impuesto, contexto),
  calendario: contexto.calendario,
});

/** Un aviso por impuesto cuyo plazo de entero ya pasó, sin contar las retenciones que quedaron en cero. */
function avisosDeEnteroVencido(retenciones: readonly RetencionDeDocumento[], contexto: ContextoDeEntero): string[] {
  const avisos = new Map<ImpuestoRetenido, string>();
  for (const retencion of retenciones.filter((r) => r.monto > 0)) {
    const plazo = plazoDe(retencion, contexto);
    if (esEnteroVencido(contexto.hoy, plazo)) {
      avisos.set(retencion.impuesto, avisoDeEnteroVencido(retencion.impuesto, fechaLimiteDeEntero(plazo)));
    }
  }
  return [...avisos.values()];
}

/**
 * Avisos de las retenciones, que no bloquean: el plazo de entero ya venció (se cuenta desde `retencion.fecha`:
 * la recepción en el IVA y la emisión de la factura en el ISR, Decreto 10-2012 art. 48) y el usuario quitó o rebajó
 * una retención propuesta (responsabilidad solidaria del agente, Código Tributario art. 29).
 */
export function avisosDeRetenciones(
  retenciones: readonly RetencionDeDocumento[],
  contexto: ContextoDeEntero,
): string[] {
  const rebajada = retenciones.some((retencion) => retencion.monto < retencion.montoPropuesto);
  return [...(rebajada ? [AVISO_DE_RETENCION_QUITADA] : []), ...avisosDeEnteroVencido(retenciones, contexto)];
}
