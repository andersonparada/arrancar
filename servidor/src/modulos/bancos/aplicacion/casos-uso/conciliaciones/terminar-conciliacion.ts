import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import { conciliacionExistente, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

/** Quien concilia la da por terminada: pasa de en proceso a elaborada; ya no se le cambian las marcas. */
export class TerminarConciliacion {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /** @throws ConciliacionNoEstaEnProceso si no está en proceso. */
  ejecutar(operador: Operador, conciliacionId: string): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      conciliacion.elaborar(operador.usuarioId);
      await repositorio.guardar(conciliacion);
      return consultas.obtener(conciliacionId);
    });
  }
}
