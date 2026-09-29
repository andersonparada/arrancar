import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** Consulta la configuración `bancos.anulaciones.misma_fecha` para la empresa. */
export interface PoliticaDeMismaFechaEnAnulacion {
  aplica(operador: Operador): Promise<boolean>;
}
