import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import type { GrupoDeDocumento } from './lineas-de-bandeja';

/** Agrega la línea si no estaba y la quita si estaba. */
export function alternarLinea(seleccion: readonly string[], lineaId: string): string[] {
  return seleccion.includes(lineaId) ? seleccion.filter((id) => id !== lineaId) : [...seleccion, lineaId];
}

/** Cuántas líneas de un documento están elegidas: ninguna, algunas o todas. */
export function estadoDelDocumento(
  grupo: Pick<GrupoDeDocumento, 'lineas'>,
  seleccion: readonly string[],
): 'ninguna' | 'algunas' | 'todas' {
  const elegidas = grupo.lineas.filter((linea) => seleccion.includes(linea.lineaId)).length;
  if (elegidas === 0) return 'ninguna';
  return elegidas === grupo.lineas.length ? 'todas' : 'algunas';
}

/** Elige todas las líneas del documento, o las quita si ya estaban todas elegidas. */
export function alternarDocumento(seleccion: readonly string[], grupo: Pick<GrupoDeDocumento, 'lineas'>): string[] {
  const ids = grupo.lineas.map((linea) => linea.lineaId);
  if (estadoDelDocumento(grupo, seleccion) === 'todas') return seleccion.filter((id) => !ids.includes(id));
  return [...seleccion, ...ids.filter((id) => !seleccion.includes(id))];
}

/** Lo elegido que sigue en la bandeja: tras recargar, una línea ya capitalizada o descartada deja de estar elegida. */
export function podarSeleccion(seleccion: readonly string[], lineas: readonly LineaDeBandeja[]): string[] {
  const vigentes = new Set(lineas.map((linea) => linea.lineaId));
  return seleccion.filter((id) => vigentes.has(id));
}

/** Las líneas elegidas, en el orden de la bandeja. */
export const lineasElegidas = (lineas: readonly LineaDeBandeja[], seleccion: readonly string[]): LineaDeBandeja[] =>
  lineas.filter((linea) => seleccion.includes(linea.lineaId));
