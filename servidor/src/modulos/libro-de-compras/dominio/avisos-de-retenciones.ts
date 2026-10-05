import type { RetencionDeDocumento } from './documento-de-compra.js';
import { esEnteroVencido, fechaLimiteDeEntero } from './plazo-de-entero.js';
import type { ImpuestoRetenido } from './retencion-propuesta.js';

export const AVISO_DE_RETENCION_QUITADA =
  'Quitó una retención que la ley manda hacer: la empresa responde de forma solidaria por el impuesto no retenido. Consulte a su contador.';

/** Lo que hace falta para saber si el plazo de entero ya venció. */
export interface ContextoDeEntero {
  /** La fecha de hoy en la zona horaria de la empresa. */
  hoy: string;
  /** El mes de recepción: desde él se cuenta el entero del ISR (acreditamiento), no desde la emisión. */
  fechaDeRecepcion: string;
  diasHabilesIva: number;
  diasHabilesIsr: number;
}

const NOMBRE_DEL_IMPUESTO: Record<ImpuestoRetenido, string> = { iva: 'IVA', isr: 'ISR' };

function fechaBaseDelEntero(retencion: RetencionDeDocumento, contexto: ContextoDeEntero): string {
  return retencion.impuesto === 'iva' ? retencion.fecha : contexto.fechaDeRecepcion;
}

const diasDelImpuesto = (impuesto: ImpuestoRetenido, contexto: ContextoDeEntero): number =>
  impuesto === 'iva' ? contexto.diasHabilesIva : contexto.diasHabilesIsr;

function avisoDeEnteroVencido(impuesto: ImpuestoRetenido, limite: string): string {
  const [anio, mes, dia] = limite.split('-');
  return `El plazo para enterar la retención de ${NOMBRE_DEL_IMPUESTO[impuesto]} venció el ${dia}/${mes}/${anio}: se entera con multa e intereses.`;
}

/** Un aviso por impuesto cuyo plazo de entero ya pasó, sin contar las retenciones que el usuario dejó en cero. */
function avisosDeEnteroVencido(retenciones: readonly RetencionDeDocumento[], contexto: ContextoDeEntero): string[] {
  const avisos = new Map<ImpuestoRetenido, string>();
  for (const retencion of retenciones.filter((r) => r.monto > 0)) {
    const dias = diasDelImpuesto(retencion.impuesto, contexto);
    const fecha = fechaBaseDelEntero(retencion, contexto);
    if (esEnteroVencido(contexto.hoy, fecha, dias)) {
      avisos.set(retencion.impuesto, avisoDeEnteroVencido(retencion.impuesto, fechaLimiteDeEntero(fecha, dias)));
    }
  }
  return [...avisos.values()];
}

/**
 * Avisos de las retenciones, que no bloquean: el plazo de entero ya venció (IVA: mes de la fecha de la
 * retención; ISR: mes de recepción) y el usuario quitó una retención propuesta (responsabilidad solidaria del
 * agente, Decreto 20-2006 art. 7).
 */
export function avisosDeRetenciones(
  retenciones: readonly RetencionDeDocumento[],
  contexto: ContextoDeEntero,
): string[] {
  const quitada = retenciones.some((retencion) => retencion.monto === 0 && retencion.montoPropuesto > 0);
  return [...(quitada ? [AVISO_DE_RETENCION_QUITADA] : []), ...avisosDeEnteroVencido(retenciones, contexto)];
}
