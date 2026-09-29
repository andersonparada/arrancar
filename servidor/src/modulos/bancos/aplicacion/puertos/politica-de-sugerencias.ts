import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

export interface ParametrosDeSugerencias {
  vidaMediaDias: number;
  /** Confianza (%) desde la que un concepto se muestra como sugerido. */
  confianzaMinima: number;
}

/** Los parámetros de las sugerencias de la empresa: `bancos.sugerencias.*`. */
export interface PoliticaDeSugerencias {
  parametros(operador: Operador): Promise<ParametrosDeSugerencias>;
}
