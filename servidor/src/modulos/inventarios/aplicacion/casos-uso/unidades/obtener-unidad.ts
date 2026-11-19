import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDto } from '../../dto/unidad.dto.js';
import type { DependenciasDeUnidades } from './dependencias-de-unidades.js';

export class ObtenerUnidad {
  constructor(private readonly dependencias: Pick<DependenciasDeUnidades, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, unidadId: string): Promise<UnidadDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(unidadId));
  }
}
