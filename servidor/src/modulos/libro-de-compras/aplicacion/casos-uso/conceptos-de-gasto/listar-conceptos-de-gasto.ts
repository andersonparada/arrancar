import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoDeGastoDto } from '../../dto/concepto-de-gasto.dto.js';
import type { DependenciasDeConceptosDeGasto } from './dependencias-de-conceptos-de-gasto.js';

/** Los conceptos de gasto de la empresa, ordenados por nombre. */
export class ListarConceptosDeGasto {
  constructor(private readonly dependencias: Pick<DependenciasDeConceptosDeGasto, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<ConceptoDeGastoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
