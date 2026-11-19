import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** El lugar que encabeza la fecha impresa del cheque (`bancos.cheques.lugar_de_emision`). */
export interface LugarDeEmision {
  de(operador: Operador): Promise<string>;
}
