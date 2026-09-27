import type { AccesoAEmpresa } from '../../dominio/acceso-a-empresa.js';

/** En qué empresas de una cuenta trabaja cada usuario, y con qué rol. */
export interface AccesosAEmpresas {
  empresasDeLaCuenta(cuentaId: string): Promise<Set<string>>;
  rolesDeLaCuenta(cuentaId: string): Promise<Set<string>>;
  /** Sustituye los accesos del usuario a las empresas de la cuenta; no toca los de otras cuentas. */
  reemplazarEnCuenta(usuarioId: string, cuentaId: string, accesos: readonly AccesoAEmpresa[]): Promise<void>;
}
