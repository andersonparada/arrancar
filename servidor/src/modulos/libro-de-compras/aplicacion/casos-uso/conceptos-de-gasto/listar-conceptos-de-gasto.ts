import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoDeGastoDto } from '../../dto/concepto-de-gasto.dto.js';
import type { DependenciasDeConceptosDeGasto } from './dependencias-de-conceptos-de-gasto.js';
import { SembrarConceptosDeGasto } from './sembrar-conceptos-de-gasto.js';

/** Los conceptos de gasto de la empresa, ordenados por nombre; si aún no tiene, primero se le siembra la lista sugerida. */
export class ListarConceptosDeGasto {
  private readonly sembrar: SembrarConceptosDeGasto;

  constructor(
    private readonly dependencias: Pick<
      DependenciasDeConceptosDeGasto,
      'unidadDeTrabajo' | 'consultas' | 'repositorio'
    >,
  ) {
    this.sembrar = new SembrarConceptosDeGasto(dependencias.repositorio);
  }

  ejecutar(operador: Operador): Promise<ConceptoDeGastoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.sembrar.ejecutar(operador);
      return consultas.listar();
    });
  }
}
