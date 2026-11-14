import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** Consulta la variable `bancos.conciliaciones.exigir_estado_de_cuenta` de la empresa. */
export interface PoliticaDeEstadoDeCuenta {
  /** Si hay que adjuntar el estado de cuenta (PDF o foto) para terminar una conciliación. */
  exigeEstadoDeCuenta(operador: Operador): Promise<boolean>;
}
