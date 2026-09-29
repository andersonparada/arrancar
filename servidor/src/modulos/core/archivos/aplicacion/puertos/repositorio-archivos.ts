export type ClaseDeArchivo = 'imagen' | 'documento';

export interface ArchivoGuardado {
  id: string;
  clase: ClaseDeArchivo;
  rutaOriginal: string;
  /** Solo las imágenes tienen miniatura. */
  rutaMiniatura: string | null;
  tipoMime: string;
  tamanoBytes: number;
  ancho: number | null;
  alto: number | null;
  /** Huella del contenido guardado (no se calcula en las imágenes anteriores a los documentos). */
  sha256: string | null;
  paginas: number | null;
  /** Recurso que es dueño del archivo (p. ej. `bancos.conciliaciones`); sin dueño, es de uso libre. */
  recursoDueno: string | null;
}

export interface NuevoArchivo extends Omit<ArchivoGuardado, 'id'> {
  empresaId: string;
  nombreOriginal: string | null;
  /** Huella del archivo tal como llegó, antes de reescribirlo. */
  sha256Recibido: string | null;
  subidoPor: string;
}

/** Registro de los archivos de la empresa activa (RLS limita lo que se ve). */
export interface RepositorioArchivos {
  guardar(archivo: NuevoArchivo): Promise<ArchivoGuardado>;
  /** Solo imágenes sin dueño: son las que sirve `/archivos/:id`. */
  buscarImagenLibre(archivoId: string): Promise<ArchivoGuardado | null>;
  /** Solo documentos del dueño indicado. */
  buscarDocumento(archivoId: string, recursoDueno: string): Promise<ArchivoGuardado | null>;
  eliminar(archivoId: string): Promise<void>;
}
