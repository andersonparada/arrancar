/** Lo que se escribe en un Excel: una hoja con encabezados y filas, y otra con instrucciones. */
export interface HojaParaEscribir {
  nombre: string;
  encabezados: string[];
  filas: unknown[][];
  /** Cómo llenar cada columna; va en una segunda hoja. */
  instrucciones: string[][];
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
  /** @throws ArchivoNoLegible si no es un Excel o no tiene hojas. */
  leer(contenido: Buffer): Promise<HojaLeida>;
}
