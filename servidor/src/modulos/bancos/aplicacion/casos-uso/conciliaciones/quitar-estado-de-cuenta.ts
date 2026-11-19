import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import { ConciliacionSinEstadoDeCuenta } from '../../errores-de-estado-de-cuenta.js';
import {
  documentoDeLaConciliacion,
  conciliacionBloqueada,
  RECURSO_DE_ESTADOS_DE_CUENTA,
  type DependenciasDeConciliaciones,
} from './dependencias-de-conciliaciones.js';

/** Quita el estado de cuenta de una conciliación en proceso (solo quien elabora): borra el archivo y deja rastro. */
export class QuitarEstadoDeCuenta {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * @throws ConciliacionNoEstaEnProceso si ya no está en proceso.
   * @throws ConciliacionSinEstadoDeCuenta si no tiene archivo (404).
   */
  ejecutar(operador: Operador, conciliacionId: string): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas, documentos, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionBloqueada(repositorio, conciliacionId);
      const anterior = await consultas.estadoDeCuentaDe(conciliacionId);
      const archivoId = conciliacion.quitarEstadoDeCuenta();
      if (archivoId === null) throw new ConciliacionSinEstadoDeCuenta();
      await repositorio.guardar(conciliacion);
      await documentos.eliminar(archivoId, RECURSO_DE_ESTADOS_DE_CUENTA);
      await auditoria.registrar({
        recurso: 'bancos.conciliaciones',
        registroId: conciliacionId,
        accion: 'quitar',
        anterior: { estadoDeCuenta: anterior },
      });
      return documentoDeLaConciliacion(operador, this.dependencias, conciliacionId);
    });
  }
}
