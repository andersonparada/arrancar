import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { VigenciaDeCombustibleDto } from '../../dto/vigencia-de-combustible.dto.js';
import type { DependenciasDeVigenciasDeCombustible } from './dependencias-de-vigencias-de-combustible.js';

/** Las vigencias de combustible de la empresa, ordenados por vigente desde. */
export class ListarVigenciasDeCombustible {
  constructor(
    private readonly dependencias: Pick<DependenciasDeVigenciasDeCombustible, 'unidadDeTrabajo' | 'consultas'>,
  ) {}

  ejecutar(operador: Operador): Promise<VigenciaDeCombustibleDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
