/** Una fila cruda: todas sus celdas como texto. `numero` es el de Excel o el de línea del CSV (la primera es la 1). */
export interface FilaCruda {
  numero: number;
  celdas: string[];
}

export type FormatoDeArchivo = 'xlsx' | 'csv';

/** Las filas de un archivo con la fila de encabezados ya ubicada. */
export interface ArchivoDeFilas {
  formato: FormatoDeArchivo;
  /** Número de la fila de encabezados; las `filas` son las no vacías que le siguen. */
  filaDeEncabezados: number;
  encabezados: string[];
  /** Nombres esperados que se encontraron, tal como los recibió `leerFilas`. */
  reconocidos: string[];
  /** Encabezados del archivo que no coinciden con ningún nombre esperado. */
  noReconocidos: string[];
  filas: FilaCruda[];
}

/** Lee un .xlsx o un CSV detectando el formato por su contenido; sin lógica de ningún recurso. */
export interface LectorDeFilas {
  /**
   * @param encabezadosEsperados nombres (y variantes) que puede tener la fila de encabezados; se comparan
   * sin tildes, mayúsculas ni signos de puntuación.
   * @throws ExcelAntiguoNoAdmitido, ArchivoDeTextoNoAdmitido, ArchivoNoEsExcel o ArchivoNoLegible según el contenido.
   * @throws ArchivoDemasiadoGrande, DemasiadasFilas o ArchivoConCeldasDemasiadoGrandes si pasa los topes.
   * @throws EncabezadosNoEncontrados si ninguna de las primeras 20 filas trae un encabezado esperado.
   */
  leerFilas(archivo: Buffer, encabezadosEsperados: readonly string[]): Promise<ArchivoDeFilas>;
}
