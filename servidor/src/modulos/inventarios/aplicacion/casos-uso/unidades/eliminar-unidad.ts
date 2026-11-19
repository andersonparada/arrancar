import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { UnidadEnUso } from '../../../dominio/errores.js';
import { unidadExistente, type DependenciasDeUnidades } from './dependencias-de-unidades.js';

export class EliminarUnidad {
  constructor(private readonly dependencias: DependenciasDeUnidades) {}

  /**
   * Queda en la auditoría con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws UnidadEnUso si algún artículo la usa: se inactiva en vez de eliminarse.
   */
  ejecutar(operador: Operador, unidadId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const unidad = await unidadExistente(repositorio, unidadId);
      if (await repositorio.enUso(unidad.id)) throw new UnidadEnUso();
      const anterior = await consultas.obtener(unidadId);
      await repositorio.eliminar(unidad);
      await auditoria.registrar({
        recurso: 'inventarios.unidades',
        registroId: unidadId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
