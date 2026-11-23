import type { TipoDeParcela, TipoDeParcelaId } from '../../dominio/tipo-de-parcela.js';

/** Guarda y recupera los tipos de parcela para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioTiposDeParcela {
  buscar(id: TipoDeParcelaId): Promise<TipoDeParcela | null>;
  agregar(tipoDeParcela: TipoDeParcela): Promise<void>;
  guardar(tipoDeParcela: TipoDeParcela): Promise<void>;
  /** @throws RecursoEnUso si alguna parcela lo usa (llave foránea). */
  eliminar(tipoDeParcela: TipoDeParcela): Promise<void>;
  /** Si la empresa activa ya tiene algún tipo, activo o no. */
  hayAlguno(): Promise<boolean>;
  /** Agrega los tipos de la semilla; si dos siembras se cruzan, el segundo intento no repite nombres. */
  sembrar(tipos: readonly TipoDeParcela[]): Promise<void>;
}
