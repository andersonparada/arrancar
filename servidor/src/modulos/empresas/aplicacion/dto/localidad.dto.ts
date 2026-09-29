/** Localidad tal como lo ve el usuario en pantalla. */
export interface LocalidadDto {
  id: string;
  codigo: string;
  nombre: string;
  tipoId: string;
  codigoEstablecimientoSat: number | null;
  nombreComercialSat: string | null;
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
  direccion: string | null;
  activo: boolean;
  tipoNombre: string | null;
}

/** Lo que se recibe para registrar o cambiar una localidad, ya validado en su forma. */
export type SolicitudDeLocalidad = Omit<LocalidadDto, 'id' | 'tipoNombre'>;
