import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CategoriaEnUso } from '../../../dominio/errores.js';
import { categoriaExistente, type DependenciasDeCategorias } from './dependencias-de-categorias.js';

export class EliminarCategoria {
  constructor(private readonly dependencias: DependenciasDeCategorias) {}

  /**
   * Queda en la auditoría con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws CategoriaEnUso si tiene artículos: se inactiva en vez de eliminarse.
   */
  ejecutar(operador: Operador, categoriaId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const categoria = await categoriaExistente(repositorio, categoriaId);
      if (await repositorio.enUso(categoria.id)) throw new CategoriaEnUso();
      const anterior = await consultas.obtener(categoriaId);
      await repositorio.eliminar(categoria);
      await auditoria.registrar({
        recurso: 'inventarios.categorias',
        registroId: categoriaId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
