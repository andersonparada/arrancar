import type { Inmueble, InmuebleId } from '../../dominio/inmueble.js';

/** Guarda y recupera los inmuebles para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioInmuebles {
  buscar(id: InmuebleId): Promise<Inmueble | null>;
  agregar(inmueble: Inmueble): Promise<void>;
  guardar(inmueble: Inmueble): Promise<void>;
  /** @throws InmuebleEnUso si Parcelas o Activos fijos lo usan (llave foránea). */
  eliminar(inmueble: Inmueble): Promise<void>;
}
