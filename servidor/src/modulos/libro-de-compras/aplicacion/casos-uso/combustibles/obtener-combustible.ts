import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CombustibleDto } from '../../dto/combustible.dto.js';
import type { DependenciasDeCombustibles } from './dependencias-de-combustibles.js';

export class ObtenerCombustible {
  constructor(private readonly dependencias: Pick<DependenciasDeCombustibles, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, combustibleId: string): Promise<CombustibleDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(combustibleId));
  }
}
