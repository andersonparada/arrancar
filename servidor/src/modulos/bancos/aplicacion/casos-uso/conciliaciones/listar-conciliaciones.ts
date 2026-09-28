import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionResumenDto } from '../../dto/conciliacion.dto.js';
import type { DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

/** Las conciliaciones de una cuenta, de la más reciente a la más antigua. */
export class ListarConciliaciones {
  constructor(private readonly dependencias: Pick<DependenciasDeConciliaciones, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, cuentaBancariaId: string): Promise<ConciliacionResumenDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar(cuentaBancariaId));
  }
}
