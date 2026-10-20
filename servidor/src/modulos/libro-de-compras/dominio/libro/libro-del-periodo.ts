import { avisosDelLibro } from './avisos-del-libro.js';
import type { DocumentoDelLibro } from './documento-del-libro.js';
import { filaDelLibro, type FilaDelLibro } from './fila-del-libro.js';
import { resumenDelLibro, type ResumenDelLibro } from './resumen-del-libro.js';
import type { TipoDeLibro } from './tipo-de-libro.js';

export interface LibroDelPeriodo {
  tipoDeLibro: TipoDeLibro;
  filas: FilaDelLibro[];
  resumen: ResumenDelLibro;
  avisos: string[];
}

/** Arma el libro con los documentos ya ordenados (emisión, tipo, serie y número): reparte, numera y resume. */
export function libroDelPeriodo(documentos: DocumentoDelLibro[], tipoDeLibro: TipoDeLibro): LibroDelPeriodo {
  const filas = documentos.map((documento, indice) => filaDelLibro(documento, tipoDeLibro, indice + 1));
  return { tipoDeLibro, filas, resumen: resumenDelLibro(filas), avisos: avisosDelLibro(filas, tipoDeLibro) };
}
