import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ArticuloDto } from '../../dto/articulo.dto.js';
import type { DependenciasDeArticulos } from './dependencias-de-articulos.js';

/** Los artículos de la empresa, ordenados por código. */
export class ListarArticulos {
  constructor(private readonly dependencias: Pick<DependenciasDeArticulos, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<ArticuloDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
