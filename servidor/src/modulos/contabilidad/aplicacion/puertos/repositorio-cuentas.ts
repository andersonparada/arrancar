import type { Cuenta, CuentaId } from '../../dominio/cuenta.js';

/** Guarda y recupera las cuentas para modificarlas. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioCuentas {
  buscar(id: CuentaId): Promise<Cuenta | null>;
  buscarPorCodigo(codigo: string): Promise<Cuenta | null>;
  /** Si la cuenta tiene cuentas inferiores. */
  tieneHijas(id: CuentaId): Promise<boolean>;
  /** ¿Hay alguna cuenta en la empresa? La máscara de códigos no cambia desde la primera. */
  hayCuentas(): Promise<boolean>;
  agregar(cuenta: Cuenta): Promise<void>;
  guardar(cuenta: Cuenta): Promise<void>;
  eliminar(cuenta: Cuenta): Promise<void>;
}
