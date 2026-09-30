import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { RecursoEnUso } from '../../../../core/compartido/aplicacion/errores.js';
import {
  vigenciaDeCombustibleExistente,
  type DependenciasDeVigenciasDeCombustible,
} from './dependencias-de-vigencias-de-combustible.js';

export class EliminarVigenciaDeCombustible {
  constructor(private readonly dependencias: DependenciasDeVigenciasDeCombustible) {}

  /**
   * Queda en la auditoría con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws RecursoEnUso si algún documento la usa (desde L3 también lo impide la base de datos).
   */
  ejecutar(operador: Operador, vigenciaDeCombustibleId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const vigenciaDeCombustible = await vigenciaDeCombustibleExistente(repositorio, vigenciaDeCombustibleId);
      if (await repositorio.enUso(vigenciaDeCombustible.id)) throw new RecursoEnUso();
      const anterior = await consultas.obtener(vigenciaDeCombustibleId);
      await repositorio.eliminar(vigenciaDeCombustible);
      await auditoria.registrar({
        recurso: 'libro-de-compras.vigencias-de-combustible',
        registroId: vigenciaDeCombustibleId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
