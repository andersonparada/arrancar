import type { NombreDeUsuario } from '../../dominio/nombre-de-usuario.js';
import type { Usuario, UsuarioId } from '../../dominio/usuario.js';

export interface PertenenciaEnCuentas {
  enLaCuenta: boolean;
  otrasCuentas: number;
}

/** Guarda y recupera usuarios completos para modificarlos. */
export interface RepositorioUsuarios {
  buscar(id: UsuarioId): Promise<Usuario | null>;
  buscarPorNombre(nombre: NombreDeUsuario): Promise<Usuario | null>;
  /** Cuáles de los nombres indicados ya están ocupados en el servidor. */
  nombresOcupados(candidatos: string[]): Promise<Set<string>>;
  /** Si el usuario trabaja en la cuenta y en cuántas otras (sin decir cuáles). */
  pertenenciaEn(id: UsuarioId, cuentaId: string): Promise<PertenenciaEnCuentas>;
  agregar(usuario: Usuario): Promise<void>;
  actualizar(usuario: Usuario): Promise<void>;
  /** Anota que el usuario acaba de iniciar sesión. */
  registrarAcceso(id: UsuarioId): Promise<void>;
}
