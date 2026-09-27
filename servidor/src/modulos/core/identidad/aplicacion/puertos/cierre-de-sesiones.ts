/** Cierra las sesiones abiertas de un usuario, por ejemplo al cambiarle la contraseña. */
export interface CierreDeSesiones {
  cerrarTodasDe(usuarioId: string): Promise<void>;
}
