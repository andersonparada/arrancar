import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CostosDeActivoDto } from '../../dto/costo.dto.js';
import { activoExistente } from '../activos/dependencias-de-activos.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';

export class ListarCostosDeActivo {
  constructor(private readonly dependencias: DependenciasDeCostos) {}

  /** @throws RecursoNoEncontrado si el activo no existe o no es de la empresa. */
  ejecutar(operador: Operador, activoId: string): Promise<CostosDeActivoDto> {
    const { unidadDeTrabajo, repositorio, consultasDeCostos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await activoExistente(repositorio, activoId);
      return consultasDeCostos.deActivo(activoId);
    });
  }
}
