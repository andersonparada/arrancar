import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { tipoDeLocalidadExistente, type DependenciasDeTiposDeLocalidad } from './dependencias-de-tipos-de-localidad.js';

export class EliminarTipoDeLocalidad {
  constructor(private readonly dependencias: DependenciasDeTiposDeLocalidad) {}

  /**
   * Queda en la auditoría con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws RecursoEnUso si alguna localidad lo usa (la base de datos lo impide): entonces se inactiva.
   */
  ejecutar(operador: Operador, tipoDeLocalidadId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const tipoDeLocalidad = await tipoDeLocalidadExistente(repositorio, tipoDeLocalidadId);
      const anterior = await consultas.obtener(tipoDeLocalidadId);
      await repositorio.eliminar(tipoDeLocalidad);
      await auditoria.registrar({
        recurso: 'empresas.tipos-de-localidad',
        registroId: tipoDeLocalidadId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
