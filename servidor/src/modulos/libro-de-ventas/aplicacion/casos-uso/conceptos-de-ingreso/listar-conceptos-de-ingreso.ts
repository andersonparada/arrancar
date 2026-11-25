import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoDeIngresoDto } from '../../dto/concepto-de-ingreso.dto.js';
import type { DependenciasDeConceptosDeIngreso } from './dependencias-de-conceptos-de-ingreso.js';
import { SembrarConceptosDeIngreso } from './sembrar-conceptos-de-ingreso.js';

type DependenciasDeLista = Pick<DependenciasDeConceptosDeIngreso, 'unidadDeTrabajo' | 'consultas' | 'repositorio'>;

/** Los conceptos de ingreso de la empresa, por nombre; si aún no tiene, primero se le siembra la lista sugerida. */
export class ListarConceptosDeIngreso {
  private readonly sembrar: SembrarConceptosDeIngreso;

  constructor(private readonly dependencias: DependenciasDeLista) {
    this.sembrar = new SembrarConceptosDeIngreso(dependencias);
  }

  ejecutar(operador: Operador): Promise<ConceptoDeIngresoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.sembrar.ejecutar(operador);
      return consultas.listar();
    });
  }
}
