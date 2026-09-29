import type { TipoDeLocalidad, TipoDeLocalidadId } from '../../dominio/tipo-de-localidad.js';

/** Guarda y recupera los tipos de localidad para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioTiposDeLocalidad {
  buscar(id: TipoDeLocalidadId): Promise<TipoDeLocalidad | null>;
  agregar(tipoDeLocalidad: TipoDeLocalidad): Promise<void>;
  guardar(tipoDeLocalidad: TipoDeLocalidad): Promise<void>;
  /** @throws RecursoEnUso si alguna localidad lo usa (llave foránea). */
  eliminar(tipoDeLocalidad: TipoDeLocalidad): Promise<void>;
  /** Si la empresa activa ya tiene algún tipo, activo o no. */
  hayAlguno(): Promise<boolean>;
  /** Agrega los tipos de la semilla; si dos siembras se cruzan, el segundo intento no repite nombres. */
  sembrar(tipos: readonly TipoDeLocalidad[]): Promise<void>;
}
