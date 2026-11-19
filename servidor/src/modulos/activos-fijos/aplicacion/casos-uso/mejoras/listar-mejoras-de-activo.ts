import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { MejoraDto } from '../../dto/mejora.dto.js';
import { activoExistente } from '../activos/dependencias-de-activos.js';
import type { DependenciasDeMejoras } from './dependencias-de-mejoras.js';

type Dependencias = Pick<DependenciasDeMejoras, 'unidadDeTrabajo' | 'repositorio' | 'consultasDeMejoras'>;

export class ListarMejorasDeActivo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Las mejoras y costos posteriores del activo, de la más reciente a la más antigua (con las anuladas).
   * @throws RecursoNoEncontrado si el activo no existe o no es de la empresa.
   */
  ejecutar(operador: Operador, activoId: string): Promise<MejoraDto[]> {
    const { unidadDeTrabajo, repositorio, consultasDeMejoras } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await activoExistente(repositorio, activoId);
      return consultasDeMejoras.deActivo(activoId);
    });
  }
}
