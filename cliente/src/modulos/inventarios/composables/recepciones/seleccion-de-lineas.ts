import { esNotaDeCredito, type DocumentoPorRecibir } from './agrupar-lineas';

/** Agrega o quita una línea de la selección, sin tocar la original. */
export const alternarLinea = (seleccion: string[], id: string): string[] =>
  seleccion.includes(id) ? seleccion.filter((actual) => actual !== id) : [...seleccion, id];

/** Los ids de las líneas que se pueden recibir de un documento: las de una nota de crédito no se reciben. */
export const recibiblesDe = (documento: DocumentoPorRecibir): string[] =>
  documento.lineas.filter((linea) => !esNotaDeCredito(linea)).map((linea) => linea.lineaId);

/** Marca todas las líneas recibibles del documento, o las desmarca; las de otros documentos se conservan. */
export function marcarDocumento(seleccion: string[], documento: DocumentoPorRecibir, marcar: boolean): string[] {
  const ids = recibiblesDe(documento);
  const resto = seleccion.filter((id) => !ids.includes(id));
  return marcar ? [...resto, ...ids] : resto;
}

/** ¿Están marcadas todas las líneas recibibles del documento? Un documento sin líneas recibibles no cuenta. */
export function documentoMarcado(seleccion: string[], documento: DocumentoPorRecibir): boolean {
  const ids = recibiblesDe(documento);
  return ids.length > 0 && ids.every((id) => seleccion.includes(id));
}

/** La selección sin las líneas que ya no están en la bandeja (se recibieron, se descartaron o se filtraron). */
export const seleccionVigente = (seleccion: string[], disponibles: string[]): string[] =>
  seleccion.filter((id) => disponibles.includes(id));
