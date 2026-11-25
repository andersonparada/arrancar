import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ConceptoDeIngresoEnUso } from '../../../dominio/errores.js';
import {
  conceptoDeIngresoExistente,
  type DependenciasDeConceptosDeIngreso,
} from './dependencias-de-conceptos-de-ingreso.js';

export class EliminarConceptoDeIngreso {
  constructor(private readonly dependencias: DependenciasDeConceptosDeIngreso) {}

  /**
   * Queda en la auditoría con cómo estaba.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ConceptoDeIngresoDeSistema si es de sistema.
   * @throws ConceptoDeIngresoEnUso si tiene líneas de documentos: se inactiva en vez de eliminarse.
   */
  ejecutar(operador: Operador, conceptoDeIngresoId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const concepto = await conceptoDeIngresoExistente(repositorio, conceptoDeIngresoId);
      concepto.exigirQueNoSeaDeSistema();
      if (await repositorio.enUso(concepto.id)) throw new ConceptoDeIngresoEnUso();
      const anterior = await consultas.obtener(conceptoDeIngresoId);
      await repositorio.eliminar(concepto);
      await auditoria.registrar({
        recurso: 'libro-de-ventas.conceptos-de-ingreso',
        registroId: conceptoDeIngresoId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
