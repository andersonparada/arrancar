/** Departamento tal como lo ve el usuario en pantalla. */
export interface DepartamentoDto {
  id: string;
  codigo: string;
  nombre: string;
  localidadId: string | null;
  activo: boolean;
  localidadNombre: string | null;
}

/** Lo que se recibe para registrar o cambiar un departamento, ya validado en su forma. */
export type SolicitudDeDepartamento = Omit<DepartamentoDto, 'id' | 'localidadNombre'>;
