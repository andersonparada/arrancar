import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ClaseDto } from '../../dto/clase.dto.js';
import type { DependenciasDeClases } from './dependencias-de-clases.js';

export class ObtenerClase {
  constructor(private readonly dependencias: Pick<DependenciasDeClases, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, claseId: string): Promise<ClaseDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(claseId));
  }
}
