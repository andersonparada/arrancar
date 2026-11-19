import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { articuloExistente, type DependenciasDeArticulos } from './dependencias-de-articulos.js';

export class EliminarArticulo {
  constructor(private readonly dependencias: DependenciasDeArticulos) {}

  /**
   * Se lleva sus conversiones y lotes, y queda en la auditoría con cómo estaba. Cuando existan los movimientos
   * (INV-4), uno con movimientos no se elimina: se inactiva.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   */
  ejecutar(operador: Operador, articuloId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const articulo = await articuloExistente(repositorio, articuloId);
      const anterior = await consultas.obtener(articuloId);
      await repositorio.eliminar(articulo);
      await auditoria.registrar({
        recurso: 'inventarios.articulos',
        registroId: articuloId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
