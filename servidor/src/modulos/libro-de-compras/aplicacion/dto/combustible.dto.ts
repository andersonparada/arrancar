/** Combustible tal como lo ve el usuario en pantalla. */
export interface CombustibleDto {
  id: string;
  nombre: string;
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar un combustible, ya validado en su forma. */
export type SolicitudDeCombustible = Omit<CombustibleDto, 'id'>;
