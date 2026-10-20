import type { CalendarioLaboral } from './calendario-laboral.js';
import type { RetencionDeDocumento } from './documento-de-compra.js';
import { esEnteroVencido, fechaLimiteDeEntero, ULTIMO_DIA_HABIL, type PlazoDeEntero } from './plazo-de-entero.js';
import { GRUPO_DE_ENTERO, claveDelGrupo, mesDeLaRetencion } from './retenciones/grupo-de-entero.js';
import type { ImpuestoRetenido } from './retencion-propuesta.js';

export const AVISO_DE_RETENCION_QUITADA =
  'Quitó o rebajó una retención que la ley manda hacer: la empresa responde solidariamente por el impuesto no retenido (Código Tributario art. 29) y, si es ISR, el gasto puede no ser deducible (Decreto 10-2012 art. 22). Consulte a su contador.';
export const AVISO_DE_RETENCION_QUITADA_SIN_ISR =
  'Quitó o rebajó una retención que la ley manda hacer: la empresa responde solidariamente por el impuesto no retenido (Código Tributario art. 29). Consulte a su contador.';

/** Lo que hace falta para saber si el plazo de entero ya venció. */
export interface ContextoDeEntero {
  /** La fecha de hoy en la zona horaria de la empresa. */
  hoy: string;
  diasHabilesIva: number;
  diasHabilesIsr: number;
  calendario: CalendarioLaboral;
  /** Sin ISR sobre utilidades el aviso de la retención rebajada no habla de deducibilidad. */
  empresaConIsrSobreUtilidades: boolean;
  /** Los meses y grupos (`claveDelGrupo`) que ya tienen un entero vigente: ahí el plazo vencido no se avisa. */
  gruposEnterados?: ReadonlySet<string>;
}

export const AVISO_DE_MES_YA_ENTERADO = 'Ese mes ya se enteró: pague la diferencia (pago complementario).';

const estaEnterada = (retencion: RetencionDeDocumento, contexto: ContextoDeEntero): boolean =>
  contexto.gruposEnterados?.has(claveDelGrupo(mesDeLaRetencion(retencion.fecha), GRUPO_DE_ENTERO[retencion.regla])) ??
  false;

const DESCRIPCION_DEL_IMPUESTO: Record<ImpuestoRetenido, string> = {
  iva: 'IVA',
  isr: 'ISR (se cuenta desde la fecha de la factura, Decreto 10-2012 art. 48)',
};

/** El plazo depende de la regla: el IVA de la factura especial vence el último día hábil del mes siguiente. */
const diasDeLaRegla = (retencion: RetencionDeDocumento, contexto: ContextoDeEntero): PlazoDeEntero['diasHabiles'] => {
  if (retencion.regla === 'iva_factura_especial') return ULTIMO_DIA_HABIL;
  return retencion.impuesto === 'iva' ? contexto.diasHabilesIva : contexto.diasHabilesIsr;
};

function avisoDeEnteroVencido(impuesto: ImpuestoRetenido, limite: string): string {
  const [anio, mes, dia] = limite.split('-');
  return `El plazo para enterar la retención de ${DESCRIPCION_DEL_IMPUESTO[impuesto]} venció el ${dia}/${mes}/${anio}.`;
}

const plazoDe = (retencion: RetencionDeDocumento, contexto: ContextoDeEntero): PlazoDeEntero => ({
  fechaDeLaRetencion: retencion.fecha,
  diasHabiles: diasDeLaRegla(retencion, contexto),
  calendario: contexto.calendario,
});

/**
 * Un aviso por impuesto cuyo plazo de entero ya pasó, sin contar las retenciones que quedaron en cero. Si el mes y
 * grupo ya tiene un entero, el aviso de vencido se apaga y se avisa que hay que pagar la diferencia.
 */
function avisosDeEnteroVencido(retenciones: readonly RetencionDeDocumento[], contexto: ContextoDeEntero): string[] {
  const avisos = new Map<ImpuestoRetenido, string>();
  for (const retencion of retenciones.filter((r) => r.monto > 0)) {
    if (estaEnterada(retencion, contexto)) {
      avisos.set(retencion.impuesto, AVISO_DE_MES_YA_ENTERADO);
      continue;
    }
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
  const avisoDeRebaja = contexto.empresaConIsrSobreUtilidades
    ? AVISO_DE_RETENCION_QUITADA
    : AVISO_DE_RETENCION_QUITADA_SIN_ISR;
  return [...(rebajada ? [avisoDeRebaja] : []), ...avisosDeEnteroVencido(retenciones, contexto)];
}
