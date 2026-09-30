import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { VigenciaDeCombustibleDto } from '../../dto/vigencia-de-combustible.dto.js';
import type { DependenciasDeVigenciasDeCombustible } from './dependencias-de-vigencias-de-combustible.js';

export class ObtenerVigenciaDeCombustible {
  constructor(
    private readonly dependencias: Pick<DependenciasDeVigenciasDeCombustible, 'unidadDeTrabajo' | 'consultas'>,
  ) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, vigenciaDeCombustibleId: string): Promise<VigenciaDeCombustibleDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(vigenciaDeCombustibleId));
  }
}
