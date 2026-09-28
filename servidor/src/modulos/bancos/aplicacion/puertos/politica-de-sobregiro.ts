import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** Consulta la configuración de sobregiro para la empresa. */
export interface PoliticaDeSobregiro {
  permiteSobregiro(operador: Operador): Promise<boolean>;
}
