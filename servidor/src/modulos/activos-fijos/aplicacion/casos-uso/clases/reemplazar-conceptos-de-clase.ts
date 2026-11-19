import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConceptoDeClaseDto } from '../../dto/concepto-de-clase.dto.js';
import { claseExistente, type DependenciasDeClases } from './dependencias-de-clases.js';

interface NuevosConceptos {
  claseId: string;
  conceptoIds: readonly string[];
}

const RECURSO = 'activos-fijos.clases-por-concepto';

/** Deja en la auditoría cada concepto que dejó de proponer una clase, como estaba. */
async function auditarQuitados(auditoria: Auditoria, quitados: readonly ConceptoDeClaseDto[]): Promise<void> {
  for (const anterior of quitados)
    await auditoria.registrar({ recurso: RECURSO, registroId: anterior.conceptoDeGastoId, accion: 'quitar', anterior });
}

/** Fija los conceptos de gasto que proponen la clase: los que faltan en la lista dejan de proponerla. */
export class ReemplazarConceptosDeClase {
  constructor(private readonly dependencias: DependenciasDeClases) {}

  /**
   * Un concepto propone una sola clase: el que ya proponía otra pasa a esta, y esa otra relación queda en la auditoría.
   * @throws RecursoNoEncontrado si la clase o algún concepto no existe o no es de la empresa.
   */
  ejecutar(operador: Operador, { claseId, conceptoIds }: NuevosConceptos): Promise<ConceptoDeClaseDto[]> {
    const { unidadDeTrabajo, repositorio, relacion, auditoria } = this.dependencias;
    const ids = [...new Set(conceptoIds)];
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await claseExistente(repositorio, claseId);
      const pedidos = await relacion.actuales(ids);
      if (pedidos.length !== ids.length) throw new RecursoNoEncontrado('El concepto de gasto');
      const propios = await relacion.deLaClase(claseId);
      const quitados = propios.filter((propio) => !ids.includes(propio.conceptoDeGastoId));
      const movidos = pedidos.filter((pedido) => pedido.claseId !== null && pedido.claseId !== claseId);
      await relacion.quitar(
        claseId,
        quitados.map((quitado) => quitado.conceptoDeGastoId),
      );
      await relacion.poner(operador.empresaId, claseId, ids);
      await auditarQuitados(auditoria, [...quitados, ...movidos]);
      return relacion.deLaClase(claseId);
    });
  }
}
