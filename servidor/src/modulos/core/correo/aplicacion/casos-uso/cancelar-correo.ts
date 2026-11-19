import type { Auditoria } from '../../../compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { CorreoNoPendiente, validarMotivoDeCancelacion } from '../errores-del-historial.js';
import type { CorreoDto } from '../dto/correo.dto.js';
import type { HistorialDeCorreos } from '../puertos/historial-de-correos.js';

export const RECURSO_DE_CORREOS = 'core.correos_salientes';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  historial: HistorialDeCorreos;
  auditoria: Auditoria;
}

/** Lo que se guarda en la auditoría: nunca el cuerpo del correo. */
function resumenSinCuerpo({ cuerpoTexto: _cuerpo, ...resto }: CorreoDto) {
  return resto;
}

/** Detiene un correo que aún no sale. Queda en la auditoría con el motivo y cómo estaba. */
export class CancelarCorreo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado, MotivoDeCancelacionNoValido (400), CorreoNoPendiente (409).
   */
  async ejecutar(operador: Operador, id: string, motivo: string): Promise<CorreoDto> {
    const { unidadDeTrabajo, historial, auditoria } = this.dependencias;
    const motivoLimpio = validarMotivoDeCancelacion(motivo);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const antes = await historial.buscar(id);
      if (!antes) throw new RecursoNoEncontrado('El correo');
      const cancelado = await historial.cancelar(id, { usuarioId: operador.usuarioId, motivo: motivoLimpio });
      if (!cancelado) throw new CorreoNoPendiente();
      await auditoria.registrar({
        recurso: RECURSO_DE_CORREOS,
        registroId: id,
        accion: 'anular',
        anterior: resumenSinCuerpo(antes),
        motivo: motivoLimpio,
      });
      return (await historial.buscar(id)) as CorreoDto;
    });
  }
}
