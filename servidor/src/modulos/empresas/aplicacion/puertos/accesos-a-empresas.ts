/** Qué empresas puede usar cada usuario (sus roles y permisos son de la cuenta, no de la empresa). */
export interface AccesosAEmpresas {
  /** Ids de todas las empresas a las que el usuario tiene acceso, activas o no. */
  empresasDelUsuario(usuarioId: string): Promise<ReadonlySet<string>>;
  darAcceso(acceso: { empresaId: string; usuarioId: string }): Promise<void>;
}
