import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import { documentoDeLaConciliacion, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

/** La conciliación con sus movimientos candidatos y el cálculo en vivo (saldo conciliado y diferencia). */
export class ObtenerConciliacion {
  constructor(
    private readonly dependencias: Pick<DependenciasDeConciliaciones, 'unidadDeTrabajo' | 'consultas' | 'cargaInicial'>,
  ) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, conciliacionId: string): Promise<ConciliacionDto> {
    const { unidadDeTrabajo } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () =>
      documentoDeLaConciliacion(operador, this.dependencias, conciliacionId),
    );
  }
}
