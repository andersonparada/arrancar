import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { tipoDeParcelaExistente, type DependenciasDeTiposDeParcela } from './dependencias-de-tipos-de-parcela.js';

export class EliminarTipoDeParcela {
  constructor(private readonly dependencias: DependenciasDeTiposDeParcela) {}

  /**
   * Queda en la auditoría con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws RecursoEnUso si alguna parcela lo usa (la base de datos lo impide): entonces se inactiva.
   */
  ejecutar(operador: Operador, tipoDeParcelaId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const tipoDeParcela = await tipoDeParcelaExistente(repositorio, tipoDeParcelaId);
      const anterior = await consultas.obtener(tipoDeParcelaId);
      await repositorio.eliminar(tipoDeParcela);
      await auditoria.registrar({
        recurso: 'parcelas.tipos-de-parcela',
        registroId: tipoDeParcelaId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
