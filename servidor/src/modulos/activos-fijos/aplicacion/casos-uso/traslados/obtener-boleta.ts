import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BoletaDto } from '../../dto/traslado.dto.js';
import type { DependenciasDeTraslados } from './dependencias-de-traslados.js';

export class ObtenerBoleta {
  constructor(private readonly dependencias: DependenciasDeTraslados) {}

  /** @throws RecursoNoEncontrado si la boleta no existe o no es de la empresa. */
  ejecutar(operador: Operador, grupoId: string): Promise<BoletaDto> {
    const { unidadDeTrabajo, consultasDeTraslados } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultasDeTraslados.boleta(grupoId));
  }
}
