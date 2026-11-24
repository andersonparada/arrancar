import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { Hallazgo } from '../../dominio/cierre/hallazgos-del-cierre.js';

/** La pregunta a los demás módulos antes de cerrar un mes (`inventarios.revisar_cierre_del_mes`). */
export interface PreguntasDelCierre {
  /** Lo que los demás módulos activos saben que afecta el cierre del mes; vacío si ninguno dice nada. */
  hallazgosDeOtrosModulos(operador: Operador, periodo: string): Promise<Hallazgo[]>;
}
