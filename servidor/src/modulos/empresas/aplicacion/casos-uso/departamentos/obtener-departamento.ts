import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DepartamentoDto } from '../../dto/departamento.dto.js';
import type { DependenciasDeDepartamentos } from './dependencias-de-departamentos.js';

export class ObtenerDepartamento {
  constructor(private readonly dependencias: Pick<DependenciasDeDepartamentos, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, departamentoId: string): Promise<DepartamentoDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(departamentoId));
  }
}
