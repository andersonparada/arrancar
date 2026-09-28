import type { ChequeraDto, FiltroDeChequeras } from '../dto/chequera.dto.js';

/** Lecturas para pantallas: devuelven datos planos, con el conteo de cheques por estado. */
export interface ConsultasChequeras {
  /** Las chequeras de una cuenta bancaria, más recientes primero. */
  listarDeLaCuenta(cuentaBancariaId: string): Promise<ChequeraDto[]>;
  /** Todas las chequeras de la empresa, opcionalmente de una cuenta; por cuenta, serie y desde. */
  listar(filtro: FiltroDeChequeras): Promise<ChequeraDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(chequeraId: string): Promise<ChequeraDto>;
}
