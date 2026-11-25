import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** Lo que Contabilidad necesita saber de la carga inicial de la empresa. */
export interface EstadoDeLaCarga {
  /** `AAAA-MM-DD`; nula si la empresa aún no la tiene. */
  fechaDeInicio: string | null;
  cerrada: boolean;
}

/** La carga inicial va por el mediador: Contabilidad no importa nada de Empresas. */
export interface CargaInicial {
  obtener(operador: Operador): Promise<EstadoDeLaCarga>;
}
