import type { DocumentoConciliable, FilaConciliable } from './tipos-de-conciliacion.js';

/** Cada documento con la fila de la SAT que le corresponde, y cada fila con su documento. */
export interface Parejas {
  filaDelDocumento: ReadonlyMap<string, FilaConciliable>;
  documentoDeLaFila: ReadonlyMap<string, DocumentoConciliable>;
}

const claveDeNumero = (nit: string | null, serie: string | null, numero: string): string =>
  `${nit ?? ''}|${(serie ?? '').toUpperCase()}|${numero.toUpperCase()}`;

function indicePor(
  filas: readonly FilaConciliable[],
  clave: (fila: FilaConciliable) => string,
): Map<string, FilaConciliable> {
  return new Map(filas.map((fila) => [clave(fila), fila]));
}

/**
 * Cruza primero por autorización FEL y, con lo que queda, por NIT del emisor, serie y número: así se encuentra un
 * documento escrito a mano con la autorización mal puesta. Cada documento y cada fila entran en una sola pareja.
 */
export function emparejar(documentos: readonly DocumentoConciliable[], filas: readonly FilaConciliable[]): Parejas {
  const filaDelDocumento = new Map<string, FilaConciliable>();
  const documentoDeLaFila = new Map<string, DocumentoConciliable>();
  const unir = (documento: DocumentoConciliable, fila: FilaConciliable | undefined): void => {
    if (!fila || documentoDeLaFila.has(fila.id) || filaDelDocumento.has(documento.id)) return;
    filaDelDocumento.set(documento.id, fila);
    documentoDeLaFila.set(fila.id, documento);
  };
  const porAutorizacion = indicePor(filas, (fila) => fila.autorizacionFel.toLowerCase());
  for (const documento of documentos)
    unir(documento, porAutorizacion.get(documento.autorizacionFel?.toLowerCase() ?? ''));
  const porNumero = indicePor(filas, (fila) => claveDeNumero(fila.nitEmisor, fila.serie, fila.numero));
  for (const documento of documentos) {
    unir(documento, porNumero.get(claveDeNumero(documento.nitEmisor, documento.serie, documento.numero)));
  }
  return { filaDelDocumento, documentoDeLaFila };
}
