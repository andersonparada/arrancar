/** Una conversión de un artículo tal como la ve el usuario. */
export interface ConversionDto {
  unidadId: string;
  unidadNombre: string;
  factor: string;
  paraCompras: boolean;
}

/** Lo que se recibe para fijar las conversiones de un artículo; la lista reemplaza a la anterior. */
export interface SolicitudDeConversiones {
  conversiones: { unidadId: string; factor: string; paraCompras: boolean }[];
}
