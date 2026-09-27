import type { CuentaId } from '../../../compartido/dominio/identificador.js';
import type { Rol, RolId, UsoDelRol } from '../../dominio/rol.js';

/** Guarda y recupera roles completos (con sus permisos) para modificarlos. */
export interface RepositorioRoles {
  buscarEnCuenta(id: RolId, cuentaId: CuentaId): Promise<Rol | null>;
  usoDe(rol: Rol): Promise<UsoDelRol>;
  agregar(rol: Rol): Promise<void>;
  actualizar(rol: Rol): Promise<void>;
  eliminar(rol: Rol): Promise<void>;
}
