import type { ChequeraDto } from '../dto/chequera.dto.js';

/** Lecturas para pantallas: devuelven datos planos, con el conteo de cheques por estado. */
export interface ConsultasChequeras {
  /** Las chequeras de una cuenta bancaria, más recientes primero. */
  listarDeLaCuenta(cuentaBancariaId: string): Promise<ChequeraDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(chequeraId: string): Promise<ChequeraDto>;
}
