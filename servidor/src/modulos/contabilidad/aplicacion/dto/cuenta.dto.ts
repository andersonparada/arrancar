import type { DatosDeCuenta } from '../../dominio/reglas-de-cuenta.js';

/** Cuenta tal como la ve el usuario en pantalla. */
export interface CuentaDto extends DatosDeCuenta {
  id: string;
  padreId: string | null;
  /** El código de la cuenta superior; nulo en el primer nivel. */
  padreCodigo: string | null;
  /** Cuántos grupos tiene su código (1 a 6). */
  nivel: number;
  /** Para Multimoneda; nulo = quetzales. */
  monedaCodigo: string | null;
}

/**
 * Lo que se recibe para registrar o cambiar una cuenta, ya validado en su forma. La cuenta superior y el nivel salen
 * del código, así que no se escriben.
 */
export type SolicitudDeCuenta = DatosDeCuenta;
