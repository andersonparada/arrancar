export interface ArchivoGuardado {
  id: string;
  rutaOriginal: string;
  rutaMiniatura: string;
  tipoMime: string;
  tamanoBytes: number;
  ancho: number;
  alto: number;
}

export interface NuevoArchivo extends Omit<ArchivoGuardado, 'id'> {
  empresaId: string;
  nombreOriginal: string | null;
  subidoPor: string;
}

/** Registro de las imágenes de la empresa activa (RLS limita lo que se ve). */
export interface RepositorioArchivos {
  guardar(archivo: NuevoArchivo): Promise<ArchivoGuardado>;
  buscar(archivoId: string): Promise<ArchivoGuardado | null>;
}
