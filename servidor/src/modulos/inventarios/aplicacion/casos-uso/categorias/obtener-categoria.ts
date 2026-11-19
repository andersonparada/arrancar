import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CategoriaDto } from '../../dto/categoria.dto.js';
import type { DependenciasDeCategorias } from './dependencias-de-categorias.js';

export class ObtenerCategoria {
  constructor(private readonly dependencias: Pick<DependenciasDeCategorias, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, categoriaId: string): Promise<CategoriaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(categoriaId));
  }
}
