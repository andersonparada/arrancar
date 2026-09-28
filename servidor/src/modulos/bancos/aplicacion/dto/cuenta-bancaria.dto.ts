/** Cuenta bancaria tal como lo ve el usuario en pantalla. */
export interface CuentaBancariaDto {
  id: string;
  nombre: string;
  bancoId: string;
  numero: string;
  tipo: 'monetaria' | 'ahorro';
  observaciones: string | null;
  activo: boolean;
  bancoNombre: string | null;
}

/** Lo que se recibe para registrar o cambiar una cuenta bancaria, ya validado en su forma. */
export type SolicitudDeCuentaBancaria = Omit<CuentaBancariaDto, 'id' | 'bancoNombre'>;
