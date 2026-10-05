import type { Auditoria } from '../../../compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { anioDe } from '../../dominio/fecha-iso.js';
import type { CalendarioLaboral } from '../calendario-laboral.js';
import type { Asuetos } from '../puertos/asuetos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  asuetos: Asuetos;
  auditoria: Auditoria;
  calendario: CalendarioLaboral;
}

/** Soporte quita un asueto cargado por error o que se canceló; queda en la auditoría. */
export class QuitarAsueto {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el asueto no existe. */
  async ejecutar(operador: Operador, id: string): Promise<void> {
    const { unidadDeTrabajo, asuetos, auditoria, calendario } = this.dependencias;
    const anio = await unidadDeTrabajo.ejecutar(operador, async () => {
      const asueto = await asuetos.buscarPorId(id);
      if (!asueto) throw new RecursoNoEncontrado('El asueto');
      await asuetos.eliminar(id);
      await auditoria.registrar({ recurso: 'core.feriados', registroId: id, accion: 'eliminar', anterior: asueto });
      return anioDe(asueto.fecha);
    });
    calendario.invalidar(anio);
  }
}
