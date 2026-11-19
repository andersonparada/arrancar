import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoDeClaseDto } from '../../dto/concepto-de-clase.dto.js';
import { claseExistente, type DependenciasDeClases } from './dependencias-de-clases.js';

/** Los conceptos de gasto que proponen la clase («Conceptos de gasto que la proponen» en su ficha). */
export class ListarConceptosDeClase {
  constructor(
    private readonly dependencias: Pick<DependenciasDeClases, 'unidadDeTrabajo' | 'repositorio' | 'relacion'>,
  ) {}

  /** @throws RecursoNoEncontrado si la clase no existe o no es de la empresa. */
  ejecutar(operador: Operador, claseId: string): Promise<ConceptoDeClaseDto[]> {
    const { unidadDeTrabajo, repositorio, relacion } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await claseExistente(repositorio, claseId);
      return relacion.deLaClase(claseId);
    });
  }
}
