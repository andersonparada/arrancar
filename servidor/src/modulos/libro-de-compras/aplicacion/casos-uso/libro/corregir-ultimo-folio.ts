import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { FolioMenorQueLoEmitido } from '../../errores-de-emision.js';
import type { RepositorioDeEmisiones, RepositorioDeFoliacion } from '../../puertos/emisiones-del-libro.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  emisiones: RepositorioDeEmisiones;
  foliacion: RepositorioDeFoliacion;
  auditoria: Auditoria;
}

export interface CorreccionDelFolio {
  ultimoFolio: number;
  motivo: string;
}

/**
 * Pone el último folio usado, por ejemplo de una empresa que viene de hojas ya usadas u otro sistema. Nunca por
 * debajo del mayor folio que Arrancar ya emitió. Queda en la auditoría con el valor anterior.
 */
export class CorregirUltimoFolio {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, correccion: CorreccionDelFolio): Promise<{ ultimoFolio: number }> {
    const { unidadDeTrabajo, emisiones, foliacion, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const anterior = await foliacion.bloquear(operador.empresaId);
      const emitido = await emisiones.mayorFolioEmitido();
      if (correccion.ultimoFolio < emitido) throw new FolioMenorQueLoEmitido(emitido);
      await auditoria.registrar({
        recurso: 'libro-de-compras.foliacion-del-libro',
        registroId: operador.empresaId,
        accion: 'corregir',
        anterior: { ultimoFolio: anterior },
        motivo: correccion.motivo,
      });
      await foliacion.fijarUltimoFolio(operador.empresaId, correccion.ultimoFolio);
      return { ultimoFolio: correccion.ultimoFolio };
    });
  }
}
