import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { CifrasDeVentasEnLaFoto } from '../../dominio/periodos/foto-del-periodo.js';

/** Las cifras de ventas del período que dan los módulos de ventas activos (por el mediador). */
export interface CifrasDeVentas {
  /** @param periodo primer día del mes, `AAAA-MM-01`. Vacío si ningún módulo responde. */
  delPeriodo(operador: Operador, periodo: string): Promise<CifrasDeVentasEnLaFoto[]>;
}
