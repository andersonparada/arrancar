import type { ArchivoDescargado, ClienteHttp } from './cliente-http';

/** Un problema de una fila del Excel; sin columna, es de la fila entera. */
export interface ErrorDeImportacion {
  fila: number;
  columna: string | null;
  mensaje: string;
}

/** Qué pasó con el archivo: si se guardó y, si no, por qué (se informan todos los problemas). */
export interface ResultadoDeImportacion {
  filas: number;
  guardado: boolean;
  errores: ErrorDeImportacion[];
}

/** Exportar e importar un recurso en Excel; cada `Api*` generada trae el suyo. */
export interface IntercambioDeDatos {
  exportar(): Promise<ArchivoDescargado>;
  plantilla(): Promise<ArchivoDescargado>;
  /** Con `ensayo` el servidor revisa todo y no guarda nada. */
  importar(archivo: File, ensayo: boolean): Promise<ResultadoDeImportacion>;
}

/** Las tres rutas de intercambio de un recurso: `<ruta>/exportar`, `/plantilla` e `/importar`. */
export const intercambioDe = (http: ClienteHttp, ruta: string): IntercambioDeDatos => ({
  exportar: () => http.descargar(`${ruta}/exportar`),
  plantilla: () => http.descargar(`${ruta}/plantilla`),
  importar: (archivo, ensayo) => http.subir<ResultadoDeImportacion>(`${ruta}/importar`, archivo, { ensayo }),
});
