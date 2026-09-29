/** Tipo de localidad tal como lo ve el usuario en pantalla. */
export interface TipoDeLocalidadDto {
  id: string;
  nombre: string;
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar un tipo de localidad, ya validado en su forma. */
export type SolicitudDeTipoDeLocalidad = Omit<TipoDeLocalidadDto, 'id'>;
