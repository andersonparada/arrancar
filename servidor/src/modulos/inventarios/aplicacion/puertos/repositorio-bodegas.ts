import type { Bodega, BodegaId } from '../../dominio/bodega.js';

/** Guarda y recupera las bodegas para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioBodegas {
  buscar(id: BodegaId): Promise<Bodega | null>;
  agregar(bodega: Bodega): Promise<void>;
  guardar(bodega: Bodega): Promise<void>;
  /** @throws RecursoEnUso si algo la usa (llave foránea). Sus accesos se borran con ella. */
  eliminar(bodega: Bodega): Promise<void>;
}
