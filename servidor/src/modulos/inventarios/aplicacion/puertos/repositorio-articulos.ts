import type { Articulo, ArticuloId } from '../../dominio/articulo.js';

/** Guarda y recupera los artículos para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioArticulos {
  buscar(id: ArticuloId): Promise<Articulo | null>;
  agregar(articulo: Articulo): Promise<void>;
  guardar(articulo: Articulo): Promise<void>;
  /** Con sus conversiones y lotes. Hoy el artículo no tiene movimientos; INV-4 agrega esa guardia. */
  eliminar(articulo: Articulo): Promise<void>;
}
