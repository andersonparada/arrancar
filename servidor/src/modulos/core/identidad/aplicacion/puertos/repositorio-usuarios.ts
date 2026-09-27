import type { NombreDeUsuario } from '../../dominio/nombre-de-usuario.js';
import type { Usuario, UsuarioId } from '../../dominio/usuario.js';

/** Guarda y recupera usuarios completos para modificarlos. */
export interface RepositorioUsuarios {
  buscar(id: UsuarioId): Promise<Usuario | null>;
  buscarPorNombre(nombre: NombreDeUsuario): Promise<Usuario | null>;
  /** Cuáles de los nombres indicados ya están ocupados en el servidor. */
  nombresOcupados(candidatos: string[]): Promise<Set<string>>;
  /** Cuentas en las que el usuario trabaja en al menos una empresa. */
  cuentasDe(id: UsuarioId): Promise<string[]>;
  agregar(usuario: Usuario): Promise<void>;
  actualizar(usuario: Usuario): Promise<void>;
  /** Anota que el usuario acaba de iniciar sesión. */
  registrarAcceso(id: UsuarioId): Promise<void>;
}
