export interface CategoriaDto {
  id: string;
  nombre: string;
  activo: boolean;
}

export type SolicitudDeCategoria = Omit<CategoriaDto, 'id'>;
