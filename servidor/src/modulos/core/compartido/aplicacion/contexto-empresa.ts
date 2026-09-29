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
  /**
   * Recursos con alcance que esta transacción abre para asignar: lectura de la tabla protegida y
   * escritura de su tabla de accesos. **Vacío por omisión**: solo lo llena `operadorParaAsignar`,
   * en los casos de uso de la ventana de asignación.
   */
  recursosParaAsignar?: readonly string[];
  /**
   * Si es verdadero, el disparador `core.asignar_registro_al_creador` no asigna los registros
   * que se creen en la transacción (importar desde Excel: se reparten desde la ventana de accesos).
   */
  sinAsignarAlCrear?: boolean;
}
