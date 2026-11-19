import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CategoriaDto } from '../../dto/categoria.dto.js';
import type { DependenciasDeCategorias } from './dependencias-de-categorias.js';

/** Las categorías de la empresa, ordenados por nombre. */
export class ListarCategorias {
  constructor(private readonly dependencias: Pick<DependenciasDeCategorias, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<CategoriaDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
