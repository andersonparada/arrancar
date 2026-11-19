import type { Categoria, CategoriaId } from '../../dominio/categoria.js';

/** Guarda y recupera las categorías para modificarlas. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioCategorias {
  buscar(id: CategoriaId): Promise<Categoria | null>;
  agregar(categoria: Categoria): Promise<void>;
  guardar(categoria: Categoria): Promise<void>;
  eliminar(categoria: Categoria): Promise<void>;
  /** Si algún artículo es de la categoría. */
  enUso(id: CategoriaId): Promise<boolean>;
}
