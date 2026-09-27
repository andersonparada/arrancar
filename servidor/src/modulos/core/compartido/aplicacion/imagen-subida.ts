/** Una imagen tal como llega del usuario, antes de revisarla u optimizarla. */
export interface ImagenSubida {
  contenido: Buffer;
  nombreOriginal: string | null;
  tipoMime: string;
}
