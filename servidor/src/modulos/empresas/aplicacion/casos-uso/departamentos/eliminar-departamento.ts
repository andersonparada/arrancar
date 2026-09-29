import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { departamentoExistente, type DependenciasDeDepartamentos } from './dependencias-de-departamentos.js';

export class EliminarDepartamento {
  constructor(private readonly dependencias: DependenciasDeDepartamentos) {}

  /**
   * Queda en la auditoría con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o el operador no lo ve.
   * @throws RecursoEnUso si algo lo usa (la base de datos lo impide): entonces se inactiva.
   */
  ejecutar(operador: Operador, departamentoId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const departamento = await departamentoExistente(repositorio, departamentoId);
      const anterior = await consultas.obtener(departamentoId);
      await repositorio.eliminar(departamento);
      await auditoria.registrar({
        recurso: 'empresas.departamentos',
        registroId: departamentoId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
