/** Quién trabaja y dónde: define qué filas deja ver y modificar la seguridad de la base de datos. */
export interface ContextoEmpresa {
  empresaId: string;
  /** Cuenta dueña de la empresa activa; limita las tablas compartidas por cuenta. */
  cuentaId: string;
  usuarioId: string;
  /**
   * Recursos con alcance (por ejemplo `bancos.cuentas`) cuyos registros el usuario
   * ve completos. En los demás solo ve los que tiene asignados.
   */
  recursosAlcanceTotal?: readonly string[];
}
