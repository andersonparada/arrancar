import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoDeIngresoDto } from '../../dto/concepto-de-ingreso.dto.js';
import type { DependenciasDeConceptosDeIngreso } from './dependencias-de-conceptos-de-ingreso.js';

export class ObtenerConceptoDeIngreso {
  constructor(private readonly dependencias: Pick<DependenciasDeConceptosDeIngreso, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, conceptoDeIngresoId: string): Promise<ConceptoDeIngresoDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(conceptoDeIngresoId));
  }
}
