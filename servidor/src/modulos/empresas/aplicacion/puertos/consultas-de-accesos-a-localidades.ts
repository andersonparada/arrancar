/** Un usuario con acceso a una localidad. */
export interface UsuarioConAcceso {
  usuarioId: string;
  /** Su nombre de usuario, para la auditoría. */
  usuario: string;
}

/** Lecturas de las asignaciones de localidades (`empresas.accesos_a_localidades`). */
export interface ConsultasDeAccesosALocalidades {
  /** Los usuarios asignados a la localidad; vacío si el operador no la ve. */
  usuariosConAcceso(localidadId: string): Promise<UsuarioConAcceso[]>;
}
