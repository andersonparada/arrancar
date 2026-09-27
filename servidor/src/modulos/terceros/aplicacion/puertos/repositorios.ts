import type { CategoriaDeProveedor, CategoriaDeProveedorId } from '../../dominio/categoria-de-proveedor.js';
import type { Contacto, ContactoId } from '../../dominio/contacto.js';
import type { Tercero, TerceroId } from '../../dominio/tercero.js';

/**
 * Guardan y recuperan entidades completas para modificarlas. Solo ven los datos
 * de la cuenta del contexto: la seguridad por filas de la base de datos lo garantiza.
 */
export interface RepositorioTerceros {
  /** Con sus papeles. */
  buscar(id: TerceroId): Promise<Tercero | null>;
  agregar(tercero: Tercero): Promise<void>;
  guardar(tercero: Tercero): Promise<void>;
}

export interface RepositorioContactos {
  buscar(id: ContactoId): Promise<Contacto | null>;
  agregar(contacto: Contacto): Promise<void>;
  guardar(contacto: Contacto): Promise<void>;
  eliminar(contacto: Contacto): Promise<void>;
}

export interface RepositorioCategorias {
  buscar(id: CategoriaDeProveedorId): Promise<CategoriaDeProveedor | null>;
  agregar(categoria: CategoriaDeProveedor): Promise<void>;
  guardar(categoria: CategoriaDeProveedor): Promise<void>;
}
