import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BodegaDto } from '../../dto/bodega.dto.js';
import type { DependenciasDeBodegas } from './dependencias-de-bodegas.js';

/** Las bodegas de la empresa, ordenados por código. */
export class ListarBodegas {
  constructor(private readonly dependencias: Pick<DependenciasDeBodegas, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<BodegaDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
