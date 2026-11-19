import type { Clase, ClaseId } from '../../dominio/clase.js';

/** Guarda y recupera las clases de activos para modificarlas. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioClases {
  buscar(id: ClaseId): Promise<Clase | null>;
  agregar(clase: Clase): Promise<void>;
  guardar(clase: Clase): Promise<void>;
  eliminar(clase: Clase): Promise<void>;
  /** Si la clase tiene conceptos de gasto ligados (y, desde AF-2, activos): no se puede eliminar. */
  enUso(id: ClaseId): Promise<boolean>;
  hayAlguna(): Promise<boolean>;
  /** Inserta la lista sugerida sin chocar con lo que otra solicitud sembró a la vez. */
  sembrar(nuevas: readonly Clase[]): Promise<void>;
}
