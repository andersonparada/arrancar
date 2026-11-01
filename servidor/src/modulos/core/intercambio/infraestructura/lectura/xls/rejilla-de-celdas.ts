import { DemasiadasFilas } from '../../../aplicacion/errores.js';
import { ArchivoConCeldasDemasiadoGrandes } from '../../../aplicacion/errores-de-lectura.js';
import type { FilaCruda } from '../../../aplicacion/puertos/lector-de-filas.js';
import type { CeldaBiff } from './celdas-biff.js';

export const MAXIMO_DE_FILAS_DEL_XLS = 10_000;
export const MAXIMO_DE_COLUMNAS_DEL_XLS = 200;

/**
 * Las celdas con texto de la primera hoja, listas para entregarse como filas. Solo guarda celdas con algo escrito,
 * así que un archivo no puede inflar el ancho ni el largo con celdas vacías.
 * @throws DemasiadasFilas o ArchivoConCeldasDemasiadoGrandes si se pasa de los topes.
 */
export class RejillaDeCeldas {
  private readonly filas = new Map<number, Map<number, string>>();
  private ancho = 0;

  poner({ fila, columna, texto }: CeldaBiff & { texto: string }): void {
    const limpio = texto.trim();
    if (limpio === '') return;
    if (columna >= MAXIMO_DE_COLUMNAS_DEL_XLS) {
      throw new ArchivoConCeldasDemasiadoGrandes(`hay más de ${MAXIMO_DE_COLUMNAS_DEL_XLS} columnas`);
    }
    this.filaNumero(fila).set(columna, limpio);
    this.ancho = Math.max(this.ancho, columna + 1);
  }

  /** Las filas con algo escrito, en orden; la primera fila de Excel es la 1 y todas miden lo mismo de ancho. */
  aFilas(): FilaCruda[] {
    return [...this.filas.entries()]
      .sort(([a], [b]) => a - b)
      .map(([fila, celdas]) => ({
        numero: fila + 1,
        celdas: Array.from({ length: this.ancho }, (_, columna) => celdas.get(columna) ?? ''),
      }));
  }

  private filaNumero(fila: number): Map<number, string> {
    const existente = this.filas.get(fila);
    if (existente) return existente;
    if (this.filas.size >= MAXIMO_DE_FILAS_DEL_XLS) throw new DemasiadasFilas(MAXIMO_DE_FILAS_DEL_XLS);
    const nueva = new Map<number, string>();
    this.filas.set(fila, nueva);
    return nueva;
  }
}
