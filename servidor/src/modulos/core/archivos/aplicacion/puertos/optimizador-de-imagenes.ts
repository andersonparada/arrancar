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

export interface MedidasDeImagen {
  original: MedidaDeImagen;
  miniatura: MedidaDeImagen;
}

export interface ImagenesOptimizadas {
  original: ImagenOptimizada;
  miniatura: ImagenOptimizada;
}

/** Revisa la imagen y la reduce a las dos medidas pedidas, convertida a WebP. */
export interface OptimizadorDeImagenes {
  /**
   * @throws FotoHeicNoAceptada si es una foto HEIC.
   * @throws FormatoDeImagenNoAceptado si su formato real no es JPEG, PNG ni WebP.
   * @throws ImagenDemasiadoGrande si pasa de 100 megapíxeles.
   * @throws ImagenIlegible si no se puede leer.
   */
  optimizar(contenido: Buffer, medidas: MedidasDeImagen): Promise<ImagenesOptimizadas>;
}
