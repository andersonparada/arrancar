import type { Unidad, UnidadId } from '../../dominio/unidad.js';

/** Guarda y recupera las unidades de medida para modificarlas. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioUnidades {
  buscar(id: UnidadId): Promise<Unidad | null>;
  agregar(unidad: Unidad): Promise<void>;
  guardar(unidad: Unidad): Promise<void>;
  eliminar(unidad: Unidad): Promise<void>;
  /** Si algún artículo la tiene de unidad base o en sus conversiones. */
  enUso(id: UnidadId): Promise<boolean>;
  /** Si la empresa ya tiene alguna unidad (sembrada o propia). */
  hayAlguna(): Promise<boolean>;
  /** Agrega la lista sugerida; lo que ya exista con el mismo nombre o símbolo se respeta. */
  sembrar(nuevas: readonly Unidad[]): Promise<void>;
}
