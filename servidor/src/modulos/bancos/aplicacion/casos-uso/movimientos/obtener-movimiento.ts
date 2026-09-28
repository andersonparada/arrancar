import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import type { DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

export class ObtenerMovimiento {
  constructor(private readonly dependencias: Pick<DependenciasDeMovimientos, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, movimientoId: string): Promise<MovimientoDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(movimientoId));
  }
}
