/** Un usuario con acceso a una bodega. */
export interface UsuarioConAcceso {
  usuarioId: string;
  /** Su nombre de usuario, para la auditoría. */
  usuario: string;
}

/** Lecturas de las asignaciones de bodegas (`inventarios.accesos_a_bodegas`). */
export interface ConsultasDeAccesosABodegas {
  /** Los usuarios asignados a la bodega; vacío si el operador no la ve. */
  usuariosConAcceso(bodegaId: string): Promise<UsuarioConAcceso[]>;
}
