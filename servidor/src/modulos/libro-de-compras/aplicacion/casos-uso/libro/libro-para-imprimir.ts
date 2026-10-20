import { createHash } from 'node:crypto';
import { LEYENDA_DE_MOTIVOS } from '../../../dominio/libro/motivos-del-libro.js';
import { COLUMNAS_DE_DINERO, type FilaDelLibro } from '../../../dominio/libro/fila-del-libro.js';
import { paginarLibro } from '../../../dominio/libro/paginacion-del-libro.js';
import { LibroConDemasiadasFilas } from '../../errores-de-emision.js';
import type { DatosDelPdfDelLibro } from '../../puertos/generador-de-pdf-del-libro.js';
import type { LibroArmado } from './consultar-libro.js';

/** Igual que la importación: más filas que esto no se imprime con folios. */
export const MAXIMO_DE_FILAS_DEL_PDF = 5000;
/** Sube cuando cambia el dibujo: una copia hecha con otra versión podría paginar distinto. */
export const VERSION_DE_PLANTILLA = 1;

/** Lo que el PDF necesita. @throws LibroConDemasiadasFilas si el libro pasa del tope. */
export function libroParaImprimir(armado: LibroArmado, primerFolio: number | null): DatosDelPdfDelLibro {
  const { libro } = armado;
  if (libro.filas.length > MAXIMO_DE_FILAS_DEL_PDF) {
    throw new LibroConDemasiadasFilas(libro.filas.length, MAXIMO_DE_FILAS_DEL_PDF);
  }
  return {
    empresa: armado.empresa,
    periodo: armado.periodo,
    tipoDeLibro: libro.tipoDeLibro,
    libro: paginarLibro(libro.filas),
    resumen: libro.resumen,
    leyenda: LEYENDA_DE_MOTIVOS,
    primerFolio,
  };
}

/** sha256 de las filas (documento y montos, en orden): dice si los datos cambiaron desde una emisión. */
export function huellaDelLibro(filas: FilaDelLibro[]): string {
  const huella = createHash('sha256');
  for (const fila of filas) {
    huella.update(`${fila.documentoId}|${COLUMNAS_DE_DINERO.map((columna) => fila[columna]).join(',')}\n`);
  }
  return huella.digest('hex');
}
