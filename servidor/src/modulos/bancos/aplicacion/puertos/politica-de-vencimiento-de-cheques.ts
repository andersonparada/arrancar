import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** Consulta la variable `bancos.cheques.meses_de_vencimiento` de la empresa. */
export interface PoliticaDeVencimientoDeCheques {
  mesesDeVencimiento(operador: Operador): Promise<number>;
}
