import type { DatosDeSaldoInicial } from '../../dominio/saldos-iniciales/saldo-inicial.js';

/** El saldo inicial de un activo tal como se guarda (§5.6). */
export interface RegistroDeSaldoInicial {
  empresaId: string;
  activoId: string;
  /** El día anterior a la fecha de inicio de la empresa. */
  fechaDeCorte: string;
  datos: DatosDeSaldoInicial;
}

/** Guarda el saldo inicial de los activos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioSaldosIniciales {
  agregar(registro: RegistroDeSaldoInicial): Promise<void>;
  /** Cambia los montos de un saldo ya guardado (y su fecha de corte). */
  reemplazar(registro: RegistroDeSaldoInicial): Promise<void>;
  /** La fecha de inicio cambió: mueve el día de corte de todos los saldos y el mes de arranque de sus tramos y costos. */
  reubicar(fechaDeInicio: string): Promise<void>;
}
