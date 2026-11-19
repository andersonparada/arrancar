/** Bodega tal como lo ve el usuario en pantalla. */
export interface BodegaDto {
  id: string;
  codigo: string;
  nombre: string;
  localidadId: string | null;
  /** Solo para mostrar y exportar; viene de la localidad que el usuario ve. */
  localidadNombre: string | null;
  responsable: string | null;
  responsableUsuarioId: string | null;
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar una bodega, ya validado en su forma. */
export type SolicitudDeBodega = Omit<BodegaDto, 'id' | 'localidadNombre'>;
