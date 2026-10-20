import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { AccionSugerida, ResolucionDeRetencion } from '../../servicios/retenciones.api';
import { NOMBRES_DE_RESOLUCIONES } from '../../textos-de-retenciones';

export const MAXIMO_DE_LA_NOTA = 300;

/** Las formas de resolver en orden de nombre. */
export const opcionesDeResolucion = (): OpcionBuscable<string>[] =>
  (Object.keys(NOMBRES_DE_RESOLUCIONES) as ResolucionDeRetencion[])
    .map((valor) => ({ valor, texto: NOMBRES_DE_RESOLUCIONES[valor] }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));

const SUGERENCIAS: Record<AccionSugerida, ResolucionDeRetencion | ''> = {
  anular_constancia: 'constancia_anulada',
  rectificar_entero: 'rectificada',
  anular_constancia_y_rectificar: '',
  confirmar: 'no_requiere',
};

/** La resolución que se deja escogida de entrada; si hay que hacer dos cosas, el usuario decide. */
export const resolucionSugerida = (accion: AccionSugerida): ResolucionDeRetencion | '' => SUGERENCIAS[accion];

/** Todas piden nota, menos volver a «pendiente». */
export const pideNota = (resolucion: string): boolean => resolucion !== '' && resolucion !== 'pendiente';

/** Revisa que se haya escogido cómo se resolvió y, si hace falta, que haya nota. */
export function revisarResolucion(resolucion: string, nota: string): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!resolucion) errores.resolucion = 'Escoja cómo se resolvió.';
  else if (pideNota(resolucion) && !nota.trim()) errores.nota = 'Cuente brevemente qué hizo.';
  else if (nota.trim().length > MAXIMO_DE_LA_NOTA)
    errores.nota = `La nota admite hasta ${MAXIMO_DE_LA_NOTA} caracteres.`;
  return errores;
}

/** La nota que se manda: ninguna al volver a «pendiente». */
export const notaParaEnviar = (resolucion: string, nota: string): string | null =>
  pideNota(resolucion) ? nota.trim() : null;

/** Lo que se manda al servidor al resolver; el texto de la resolución ya viene de la lista de opciones. */
export const cuerpoDeResolucion = (resolucion: string, nota: string) => ({
  resolucion: resolucion as ResolucionDeRetencion,
  nota: notaParaEnviar(resolucion, nota),
});

/** Al abrir la ventana: la sugerencia del servidor si todavía está pendiente; si ya se resolvió, nada escogido. */
export const resolucionInicial = (retencion: { resolucion: string; accionSugerida: AccionSugerida }) =>
  retencion.resolucion === 'pendiente' ? resolucionSugerida(retencion.accionSugerida) : '';
