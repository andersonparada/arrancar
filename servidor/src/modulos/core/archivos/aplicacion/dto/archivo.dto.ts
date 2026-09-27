import type { Readable } from 'node:stream';

/** Lo que el cliente necesita saber de una imagen recién subida. */
export interface ArchivoDto {
  id: string;
  ancho: number;
  alto: number;
  tamanoBytes: number;
}

export interface ImagenAbierta {
  tipoMime: string;
  contenido: Readable;
}
