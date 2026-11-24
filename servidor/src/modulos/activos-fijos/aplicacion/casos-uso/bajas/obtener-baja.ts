import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BajaDto } from '../../dto/baja.dto.js';
import type { DependenciasDeBajas } from './dependencias-de-bajas.js';

/** La baja o venta con sus avisos, para verla o imprimir el acta. */
export class ObtenerBaja {
  constructor(private readonly dependencias: DependenciasDeBajas) {}

  /** @throws RecursoNoEncontrado si la baja no existe o no es de la empresa. */
  ejecutar(operador: Operador, bajaId: string): Promise<BajaDto> {
    const { unidadDeTrabajo, consultasDeBajas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultasDeBajas.obtener(bajaId));
  }
}
