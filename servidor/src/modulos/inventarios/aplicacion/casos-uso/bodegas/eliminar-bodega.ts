import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { bodegaExistente, type DependenciasDeBodegas } from './dependencias-de-bodegas.js';

export class EliminarBodega {
  constructor(private readonly dependencias: DependenciasDeBodegas) {}

  /**
   * Quedan en la auditoría la bodega como estaba y los usuarios que tenían acceso (sus accesos se borran con ella).
   * @throws RecursoNoEncontrado si no existe o el operador no la ve.
   * @throws RecursoEnUso si algo la usa, como un documento (la base de datos lo impide): entonces se inactiva.
   */
  ejecutar(operador: Operador, bodegaId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, accesos, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const bodega = await bodegaExistente(repositorio, bodegaId);
      const anterior = await consultas.obtener(bodegaId);
      const usuariosConAcceso = await accesos.usuariosConAcceso(bodegaId);
      await repositorio.eliminar(bodega);
      await auditoria.registrar({
        recurso: 'inventarios.bodegas',
        registroId: bodegaId,
        accion: 'eliminar',
        anterior: { ...anterior, usuariosConAcceso },
      });
    });
  }
}
