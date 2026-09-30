import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CombustibleDto } from '../../dto/combustible.dto.js';
import type { DependenciasDeCombustibles } from './dependencias-de-combustibles.js';

/** Los combustibles de la empresa, ordenados por nombre. */
export class ListarCombustibles {
  constructor(private readonly dependencias: Pick<DependenciasDeCombustibles, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<CombustibleDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
