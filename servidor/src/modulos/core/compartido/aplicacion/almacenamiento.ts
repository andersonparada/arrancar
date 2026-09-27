import type { Readable } from 'node:stream';

/**
 * Dónde se guardan físicamente los archivos (patrón Strategy): hoy el disco local;
 * para usar S3 o R2 basta con otra implementación.
 */
export interface Almacenamiento {
  guardar(ruta: string, contenido: Buffer): Promise<void>;
  /** @throws Error si el archivo no existe. */
  leer(ruta: string): Promise<Readable>;
  eliminar(ruta: string): Promise<void>;
}
