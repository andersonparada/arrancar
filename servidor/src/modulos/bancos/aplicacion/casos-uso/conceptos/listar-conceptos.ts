import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoDto } from '../../dto/concepto.dto.js';
import type { DependenciasDeConceptos } from './dependencias-de-conceptos.js';
import { SembrarConceptos } from './sembrar-conceptos.js';

/** Los conceptos de la empresa, ordenados por nombre; si aún no tiene, primero se le siembra el catálogo. */
export class ListarConceptos {
  private readonly sembrar: SembrarConceptos;

  constructor(
    private readonly dependencias: Pick<DependenciasDeConceptos, 'unidadDeTrabajo' | 'consultas' | 'repositorio'>,
  ) {
    this.sembrar = new SembrarConceptos(dependencias.repositorio);
  }

  ejecutar(operador: Operador): Promise<ConceptoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.sembrar.ejecutar(operador);
      return consultas.listar();
    });
  }
}
