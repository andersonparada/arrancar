/** Unidad de medida tal como lo ve el usuario en pantalla. */
export interface UnidadDto {
  id: string;
  nombre: string;
  simbolo: string;
  magnitud: 'cantidad' | 'masa' | 'volumen' | 'longitud' | 'superficie' | 'empaque';
  factorALaReferencia: string | null;
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar una unidad de medida, ya validado en su forma. */
export type SolicitudDeUnidad = Omit<UnidadDto, 'id'>;
