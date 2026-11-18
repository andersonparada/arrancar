import type { Chequera, ChequeraId } from '../../dominio/chequera.js';

/** Guarda y recupera las chequeras. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioChequeras {
  buscar(id: ChequeraId): Promise<Chequera | null>;
  agregar(chequera: Chequera): Promise<void>;
  guardar(chequera: Chequera): Promise<void>;
  /** Los rangos vigentes (cualquier estado) de las chequeras registradas de una cuenta, para revisar traslapes al crear una nueva. */
  rangosDeLaCuenta(cuentaBancariaId: string): Promise<{ serie: string | null; desde: number; hasta: number }[]>;
  /** Los números de cheques de la carga inicial (chequera de apertura) que caen dentro de un rango, de menor a mayor. */
  numerosDeAperturaEnRango(
    cuentaBancariaId: string,
    rango: { serie: string | null; desde: number; hasta: number },
  ): Promise<number[]>;
}
