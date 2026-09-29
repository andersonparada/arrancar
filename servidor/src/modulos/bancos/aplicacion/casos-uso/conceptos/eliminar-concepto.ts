import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ConceptoEnUso } from '../../../dominio/errores-de-conceptos.js';
import { conceptoExistente, type DependenciasDeConceptos } from './dependencias-de-conceptos.js';

interface EliminacionDeConcepto {
  conceptoId: string;
  motivo: string;
}

/** Elimina de verdad un concepto que nadie usa; si ya clasificó algo, se inactiva. */
export class EliminarConcepto {
  constructor(private readonly dependencias: DependenciasDeConceptos) {}

  /**
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ConceptoDeSistema si lo usa el sistema.
   * @throws ConceptoEnUso si alguna nota o cheque lo usa.
   */
  ejecutar(operador: Operador, { conceptoId, motivo }: EliminacionDeConcepto): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const concepto = await conceptoExistente(repositorio, conceptoId);
      concepto.exigirQueSePuedaEliminar();
      if (await consultas.estaEnUso(conceptoId)) throw new ConceptoEnUso();
      const anterior = await consultas.obtener(conceptoId);
      await repositorio.eliminar(concepto.id);
      await auditoria.registrar({
        recurso: 'bancos.conceptos',
        registroId: conceptoId,
        accion: 'eliminar',
        anterior,
        motivo,
      });
    });
  }
}
