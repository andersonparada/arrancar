import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DepartamentoDto } from '../../dto/departamento.dto.js';
import type { DependenciasDeDepartamentos } from './dependencias-de-departamentos.js';

/** Los departamentos de la empresa, ordenados por código interno. */
export class ListarDepartamentos {
  constructor(private readonly dependencias: Pick<DependenciasDeDepartamentos, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<DepartamentoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
