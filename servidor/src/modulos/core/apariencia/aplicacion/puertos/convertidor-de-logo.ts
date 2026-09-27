export interface ConvertidorDeLogo {
  /**
   * Convierte la imagen en un PNG cuadrado con fondo transparente.
   * @throws LogoIlegible si el contenido no es una imagen válida.
   */
  aPngCuadrado(contenido: Buffer): Promise<Buffer>;
}
