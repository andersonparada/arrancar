import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoParaArticulo, ConceptosParaArticulos } from '../../puertos/conceptos-para-articulos.js';
import type { DependenciasDeArticulos } from './dependencias-de-articulos.js';

/**
 * Los conceptos de gasto que el formulario del artículo ofrece. Los da Inventarios con su propio permiso: quien
 * registra artículos no necesita ver el Libro de compras para elegir uno.
 */
export class ListarConceptosParaArticulos {
  constructor(
    private readonly dependencias: Pick<DependenciasDeArticulos, 'unidadDeTrabajo'> & {
      conceptos: ConceptosParaArticulos;
    },
  ) {}

  ejecutar(operador: Operador): Promise<ConceptoParaArticulo[]> {
    const { unidadDeTrabajo, conceptos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => conceptos.listar());
  }
}
