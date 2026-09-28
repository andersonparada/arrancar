import type { CuentaBancaria, CuentaBancariaId } from '../../dominio/cuenta-bancaria.js';

/** Guarda y recupera las cuentas bancarias para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioCuentasBancarias {
  buscar(id: CuentaBancariaId): Promise<CuentaBancaria | null>;
  agregar(cuentaBancaria: CuentaBancaria): Promise<void>;
  guardar(cuentaBancaria: CuentaBancaria): Promise<void>;
}
