import {
  NotaDeResolucionInvalida,
  ResolucionInvalida,
  ResolucionSoloDeDocumentoAnulado,
  RetencionEnCero,
} from './errores-de-retenciones.js';

export const RESOLUCIONES = ['pendiente', 'constancia_anulada', 'rectificada', 'no_requiere'] as const;
export type ResolucionDeRetencion = (typeof RESOLUCIONES)[number];

const MAXIMO_DE_LA_NOTA = 300;

/** La resolución conocida; @throws ResolucionInvalida si no es de la lista. */
export function resolucionValida(texto: string): ResolucionDeRetencion {
  const conocida = RESOLUCIONES.find((resolucion) => resolucion === texto);
  if (!conocida) throw new ResolucionInvalida();
  return conocida;
}

/**
 * Resolver (cualquiera menos volver a `pendiente`) exige una nota de 1 a 300 caracteres; al volver a `pendiente`
 * no se guarda nota.
 * @throws NotaDeResolucionInvalida
 */
export function notaDeResolucionValida(
  resolucion: ResolucionDeRetencion,
  nota: string | null | undefined,
): string | null {
  if (resolucion === 'pendiente') return null;
  const limpia = nota?.trim() ?? '';
  if (limpia.length === 0 || limpia.length > MAXIMO_DE_LA_NOTA) throw new NotaDeResolucionInvalida();
  return limpia;
}

/** Lo que se sabe de una retención para resolverla. */
export interface HechosParaResolver {
  documentoAnulado: boolean;
  /** Centavos. */
  monto: number;
}

/** @throws RetencionEnCero o ResolucionSoloDeDocumentoAnulado si no hay nada que resolver. */
export function exigirResolvible({ documentoAnulado, monto }: HechosParaResolver): void {
  if (monto <= 0) throw new RetencionEnCero();
  if (!documentoAnulado) throw new ResolucionSoloDeDocumentoAnulado();
}

export type AccionSugerida = 'anular_constancia' | 'rectificar_entero' | 'anular_constancia_y_rectificar' | 'confirmar';

/** Qué hacer con una retención de un documento anulado: anular su constancia y/o rectificar el entero, o confirmar. */
export function accionSugerida(hechos: { conConstancia: boolean; enterada: boolean }): AccionSugerida {
  if (hechos.conConstancia && hechos.enterada) return 'anular_constancia_y_rectificar';
  if (hechos.conConstancia) return 'anular_constancia';
  return hechos.enterada ? 'rectificar_entero' : 'confirmar';
}
