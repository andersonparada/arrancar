/** Banco tal como lo ve el usuario en pantalla. */
export interface BancoDto {
  id: string;
  nombre: string;
  observaciones: string | null;
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar un banco, ya validado en su forma. */
export type SolicitudDeBanco = Omit<BancoDto, 'id'>;
