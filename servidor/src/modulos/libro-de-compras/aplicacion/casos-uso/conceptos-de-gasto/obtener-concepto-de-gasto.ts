import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoDeGastoDto } from '../../dto/concepto-de-gasto.dto.js';
import type { DependenciasDeConceptosDeGasto } from './dependencias-de-conceptos-de-gasto.js';

export class ObtenerConceptoDeGasto {
  constructor(private readonly dependencias: Pick<DependenciasDeConceptosDeGasto, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, conceptoDeGastoId: string): Promise<ConceptoDeGastoDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(conceptoDeGastoId));
  }
}
