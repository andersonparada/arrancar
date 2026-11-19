import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ArticuloDto } from '../../dto/articulo.dto.js';
import type { DependenciasDeArticulos } from './dependencias-de-articulos.js';

export class ObtenerArticulo {
  constructor(private readonly dependencias: Pick<DependenciasDeArticulos, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, articuloId: string): Promise<ArticuloDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(articuloId));
  }
}
