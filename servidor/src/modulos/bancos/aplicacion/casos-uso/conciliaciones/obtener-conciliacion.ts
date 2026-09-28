import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import type { DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

/** La conciliación con sus movimientos candidatos y el cálculo en vivo (saldo conciliado y diferencia). */
export class ObtenerConciliacion {
  constructor(private readonly dependencias: Pick<DependenciasDeConciliaciones, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, conciliacionId: string): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(conciliacionId));
  }
}
