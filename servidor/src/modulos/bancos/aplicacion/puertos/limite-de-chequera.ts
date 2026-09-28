import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** Consulta la cantidad máxima de cheques permitida al crear una chequera, para la empresa. */
export interface LimiteDeChequera {
  maximoDeCheques(operador: Operador): Promise<number>;
}
