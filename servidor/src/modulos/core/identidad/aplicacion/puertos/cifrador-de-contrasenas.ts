export interface CifradorDeContrasenas {
  cifrar(contrasena: string): Promise<string>;
  /**
   * Con `hashGuardado` nulo (el usuario no existe) tarda lo mismo y siempre falla,
   * para no revelar qué nombres de usuario están registrados.
   */
  coincide(hashGuardado: string | null, contrasena: string): Promise<boolean>;
}
