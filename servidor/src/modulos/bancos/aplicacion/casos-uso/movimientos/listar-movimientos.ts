import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FiltroDeMovimientos, MovimientoDto } from '../../dto/movimiento.dto.js';
import type { DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

/** Los movimientos de la empresa, del más reciente al más antiguo; los anulados van marcados. */
export class ListarMovimientos {
  constructor(private readonly dependencias: Pick<DependenciasDeMovimientos, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, filtro: FiltroDeMovimientos = {}): Promise<MovimientoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar(filtro));
  }
}
