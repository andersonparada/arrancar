import { AjusteDeRetencionInvalido, MotivoDelAjusteObligatorio } from './errores-de-documento.js';
import type { RetencionDeDocumento } from './documento-de-compra.js';
import type { ReglaDeRetencion, RetencionPropuesta } from './retencion-propuesta.js';

/** Lo que el usuario dejó de una retención propuesta: su monto final en centavos y por qué lo cambió. */
export interface AjusteDeRetencion {
  regla: ReglaDeRetencion;
  monto: number;
  motivo: string | null;
}

/** Las fechas del documento: de ellas sale la de cada retención. */
export interface FechasParaRetenciones {
  emision: string;
  recepcion: string;
}

function indexarAjustes(propuestas: readonly RetencionPropuesta[], ajustes: readonly AjusteDeRetencion[]) {
  const reglas = new Set(propuestas.map((propuesta) => propuesta.regla));
  const porRegla = new Map<ReglaDeRetencion, AjusteDeRetencion>();
  for (const ajuste of ajustes) {
    if (!reglas.has(ajuste.regla)) {
      throw new AjusteDeRetencionInvalido(`La retención "${ajuste.regla}" no se propuso para este documento.`);
    }
    if (porRegla.has(ajuste.regla)) {
      throw new AjusteDeRetencionInvalido(`La retención "${ajuste.regla}" viene repetida.`);
    }
    porRegla.set(ajuste.regla, ajuste);
  }
  return porRegla;
}

function montoFinal(propuesta: RetencionPropuesta, ajuste: AjusteDeRetencion | undefined): number {
  if (!ajuste) return propuesta.montoPropuesto;
  if (!Number.isSafeInteger(ajuste.monto) || ajuste.monto < 0 || ajuste.monto > propuesta.base) {
    throw new AjusteDeRetencionInvalido('El monto de la retención debe estar entre cero y su base.');
  }
  return ajuste.monto;
}

function motivoDelAjuste(monto: number, propuesta: RetencionPropuesta, ajuste?: AjusteDeRetencion): string | null {
  if (monto === propuesta.montoPropuesto) return propuesta.motivoAutomatico ?? null;
  const motivo = ajuste?.motivo?.trim();
  if (!motivo) throw new MotivoDelAjusteObligatorio();
  return motivo;
}

/**
 * Fija las retenciones al registrar: cada propuesta queda con su monto propuesto y el que dejó el usuario (el
 * mismo si no la tocó, `0` si la quitó). Cambiar el monto exige motivo. La fecha sale del origen que fijó la
 * estrategia: recepción o emisión.
 * @throws AjusteDeRetencionInvalido si el ajuste es de una retención que no se propuso, repetido o fuera de rango.
 * @throws MotivoDelAjusteObligatorio si cambia el monto sin motivo.
 */
export function fijarRetenciones(
  propuestas: readonly RetencionPropuesta[],
  ajustes: readonly AjusteDeRetencion[],
  fechas: FechasParaRetenciones,
): RetencionDeDocumento[] {
  const porRegla = indexarAjustes(propuestas, ajustes);
  return propuestas.map((propuesta) => {
    const ajuste = porRegla.get(propuesta.regla);
    const monto = montoFinal(propuesta, ajuste);
    return {
      impuesto: propuesta.impuesto,
      regla: propuesta.regla,
      base: propuesta.base,
      porcentaje: propuesta.porcentaje,
      montoPropuesto: propuesta.montoPropuesto,
      monto,
      motivoDelAjuste: motivoDelAjuste(monto, propuesta, ajuste),
      fecha: propuesta.origenDeLaFecha === 'recepcion' ? fechas.recepcion : fechas.emision,
    };
  });
}

/** Las retenciones cuyo monto el usuario cambió (o quitó): hay que auditarlas y, si las quitó, avisarle. */
export function retencionesAjustadas(retenciones: readonly RetencionDeDocumento[]): RetencionDeDocumento[] {
  return retenciones.filter((retencion) => retencion.monto !== retencion.montoPropuesto);
}
