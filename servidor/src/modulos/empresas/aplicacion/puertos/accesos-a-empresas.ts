/** Qué empresas puede usar cada usuario y con qué rol. */
export interface AccesosAEmpresas {
  /** Ids de todas las empresas a las que el usuario tiene acceso, activas o no. */
  empresasDelUsuario(usuarioId: string): Promise<ReadonlySet<string>>;
  /** Rol del usuario en la empresa, o `null` si no es miembro. */
  rolEnEmpresa(usuarioId: string, empresaId: string): Promise<string | null>;
  darAcceso(acceso: { empresaId: string; usuarioId: string; rolId: string }): Promise<void>;
}
