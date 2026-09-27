export interface MedidaDeImagen {
  ladoMaximo: number;
  /** De 1 a 100. */
  calidad: number;
}

export interface ImagenOptimizada {
  contenido: Buffer;
  ancho: number;
  alto: number;
}

/** Reduce la imagen a la medida pedida y la convierte a WebP. */
export interface OptimizadorDeImagenes {
  /** @throws ImagenIlegible si el contenido no es una imagen válida. */
  optimizar(contenido: Buffer, medida: MedidaDeImagen): Promise<ImagenOptimizada>;
}
