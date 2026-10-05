import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import type { ImpuestoRetenido, ReglaDeRetencion, RetencionPropuesta } from './retencion-propuesta.js';

/** Un documento anulado de la empresa con la misma FEL (o el mismo NIT, tipo, serie y número) y lo que retuvo. */
export interface DocumentoAnuladoConRetenciones {
  serie: string | null;
  numero: string;
  /** Solo las retenciones con monto mayor que cero, en centavos. */
  retenciones: ReadonlyArray<{ impuesto: ImpuestoRetenido; regla: ReglaDeRetencion; monto: number }>;
}

/** Una propuesta que el sistema dejó en cero y lo que habría propuesto, para auditarla. */
export interface PropuestaEnCero {
  regla: ReglaDeRetencion;
  montoCalculado: number;
}

export interface RetencionesConPracticada {
  propuestas: RetencionPropuesta[];
  enCero: PropuestaEnCero[];
  avisos: string[];
}

const NOMBRE_DEL_IMPUESTO: Record<ImpuestoRetenido, string> = { iva: 'IVA', isr: 'ISR' };

const etiquetaDe = (anulado: DocumentoAnuladoConRetenciones): string =>
  anulado.serie ? `${anulado.serie}-${anulado.numero}` : anulado.numero;

/** `IVA Q75.00 e ISR Q10.00`: lo retenido por impuesto en el documento anulado. */
function resumenDeLoRetenido(anulado: DocumentoAnuladoConRetenciones): string {
  const porImpuesto = new Map<ImpuestoRetenido, number>();
  for (const { impuesto, monto } of anulado.retenciones) {
    porImpuesto.set(impuesto, (porImpuesto.get(impuesto) ?? 0) + monto);
  }
  return [...porImpuesto]
    .map(([impuesto, monto]) => `${NOMBRE_DEL_IMPUESTO[impuesto]} Q${deCentavos(monto)}`)
    .join(' e ');
}

/**
 * Protección contra la retención doble: si el mismo documento ya se registró y se anuló, y retuvo algo, las mismas
 * reglas se proponen en cero con el motivo «Practicada en el documento anulado X» y se avisa lo que ya se retuvo.
 * Lo hace el sistema, así que no exige el permiso de ajustar retenciones; si el usuario lo cambia, sí lo exige.
 */
export function aplicarRetencionPracticada(
  propuestas: readonly RetencionPropuesta[],
  anulado: DocumentoAnuladoConRetenciones | null,
): RetencionesConPracticada {
  if (!anulado || anulado.retenciones.length === 0) return { propuestas: [...propuestas], enCero: [], avisos: [] };
  const motivo = `Practicada en el documento anulado ${etiquetaDe(anulado)}`;
  const reglas = new Set(anulado.retenciones.map((retencion) => retencion.regla));
  const enCero: PropuestaEnCero[] = [];
  const nuevas = propuestas.map((propuesta) => {
    if (!reglas.has(propuesta.regla) || propuesta.montoPropuesto === 0) return propuesta;
    enCero.push({ regla: propuesta.regla, montoCalculado: propuesta.montoPropuesto });
    return { ...propuesta, montoPropuesto: 0, motivoAutomatico: motivo };
  });
  const aviso = `${motivo}: ya se retuvo ${resumenDeLoRetenido(anulado)}. Para no retener dos veces, la retención se propone en cero; si aquella retención no se enteró ni se entregó su constancia, ajústela.`;
  return { propuestas: nuevas, enCero, avisos: [aviso] };
}
