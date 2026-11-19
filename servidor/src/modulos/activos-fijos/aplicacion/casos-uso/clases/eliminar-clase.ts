import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ClaseEnUso } from '../../../dominio/errores.js';
import { claseExistente, type DependenciasDeClases } from './dependencias-de-clases.js';

export class EliminarClase {
  constructor(private readonly dependencias: DependenciasDeClases) {}

  /**
   * Queda en la auditoría con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ClaseEnUso si tiene activos o conceptos de gasto ligados: se inactiva en vez de eliminarse.
   */
  ejecutar(operador: Operador, claseId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const clase = await claseExistente(repositorio, claseId);
      if (await repositorio.enUso(clase.id)) throw new ClaseEnUso();
      const anterior = await consultas.obtener(claseId);
      await repositorio.eliminar(clase);
      await auditoria.registrar({ recurso: 'activos-fijos.clases', registroId: claseId, accion: 'eliminar', anterior });
    });
  }
}
