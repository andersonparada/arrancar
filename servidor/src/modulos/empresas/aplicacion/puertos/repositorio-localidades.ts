import type { Localidad, LocalidadId } from '../../dominio/localidad.js';

/** Guarda y recupera las localidades para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioLocalidades {
  buscar(id: LocalidadId): Promise<Localidad | null>;
  agregar(localidad: Localidad): Promise<void>;
  guardar(localidad: Localidad): Promise<void>;
  /** @throws RecursoEnUso si algo la usa (llave foránea). Sus accesos se borran con ella. */
  eliminar(localidad: Localidad): Promise<void>;
}
