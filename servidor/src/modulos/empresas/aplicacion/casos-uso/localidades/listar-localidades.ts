import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LocalidadDto } from '../../dto/localidad.dto.js';
import type { DependenciasDeLocalidades } from './dependencias-de-localidades.js';

/** Las localidades de la empresa, ordenados por nombre. */
export class ListarLocalidades {
  constructor(private readonly dependencias: Pick<DependenciasDeLocalidades, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<LocalidadDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
