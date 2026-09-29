/** Lo que se escribe en un Excel: una hoja con encabezados y filas, y otra con instrucciones. */
export interface HojaParaEscribir {
  nombre: string;
  encabezados: string[];
  filas: unknown[][];
  /** Cómo llenar cada columna; va en una segunda hoja. */
  instrucciones: string[][];
}

/** Una celda que no se puede leer (fórmula sin valor o con error): el mensaje sale en su columna. */
export class CeldaConProblema {
  constructor(readonly mensaje: string) {}
}

/** Una fila leída, con su número en Excel (la primera de datos es la 2). */
export interface FilaLeida {
  numero: number;
  celdas: unknown[];
}

/** La primera hoja de un Excel, sin las filas vacías. */
export interface HojaLeida {
  encabezados: string[];
  filas: FilaLeida[];
}

/** Lee y escribe archivos de Excel; la aplicación no sabe con qué librería. */
export interface LibroDeExcel {
  escribir(hoja: HojaParaEscribir): Promise<Buffer>;
  /**
   * @throws ArchivoNoEsExcel, ExcelConContenidoNoPermitido o ExcelDemasiadoGrandeAlDescomprimir
   * si el archivo no es un Excel normal o infla más de lo permitido.
   * @throws ArchivoNoLegible si no tiene hojas o no se puede leer.
   */
  leer(contenido: Buffer): Promise<HojaLeida>;
}
