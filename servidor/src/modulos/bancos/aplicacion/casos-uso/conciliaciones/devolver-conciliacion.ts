import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import { conciliacionExistente, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

interface SolicitudDeDevolucion {
  conciliacionId: string;
  motivo: string;
}

/** Devuelve una conciliación elaborada a en proceso, con motivo, para volver a marcar. */
export class DevolverConciliacion {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /** @throws ConciliacionNoEstaElaborada si no está elaborada. */
  ejecutar(operador: Operador, { conciliacionId, motivo }: SolicitudDeDevolucion): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      const anterior = await consultas.obtener(conciliacionId);
      conciliacion.devolver();
      await repositorio.guardar(conciliacion);
      await auditoria.registrar({
        recurso: 'bancos.conciliaciones',
        registroId: conciliacionId,
        accion: 'devolver',
        anterior,
        motivo,
      });
      return consultas.obtener(conciliacionId);
    });
  }
}
