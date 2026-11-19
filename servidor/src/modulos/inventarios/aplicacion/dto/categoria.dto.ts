/** Categoría tal como lo ve el usuario en pantalla. */
export interface CategoriaDto {
  id: string;
  nombre: string;
  tipoDeInventarioPorOmision:
    | 'mercaderia'
    | 'materia_prima'
    | 'suministros'
    | 'producto_en_proceso'
    | 'producto_terminado'
    | 'repuestos'
    | 'empaques';
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar una categoría, ya validado en su forma. */
export type SolicitudDeCategoria = Omit<CategoriaDto, 'id'>;
