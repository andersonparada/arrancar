/** En qué empresas de una cuenta trabaja cada usuario. */
export interface AccesosAEmpresas {
  /** Las empresas de la cuenta: id → nombre. */
  empresasDeLaCuenta(cuentaId: string): Promise<Map<string, string>>;
  /** Ids de las empresas de la cuenta donde trabaja el usuario. */
  empresasDelUsuario(usuarioId: string, cuentaId: string): Promise<Set<string>>;
  agregar(usuarioId: string, empresaIds: readonly string[]): Promise<void>;
  /** Solo quita las indicadas; los accesos a otras cuentas no se tocan. */
  quitar(usuarioId: string, empresaIds: readonly string[]): Promise<void>;
}
