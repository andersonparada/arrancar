import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoDto } from '../../dto/concepto.dto.js';
import type { DependenciasDeConceptos } from './dependencias-de-conceptos.js';

export class ObtenerConcepto {
  constructor(private readonly dependencias: Pick<DependenciasDeConceptos, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, conceptoId: string): Promise<ConceptoDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(conceptoId));
  }
}
