import type { BandejaDeSalida } from '../../../../core/correo/aplicacion/bandeja-de-salida.js';
import type { CorreoResumenDto } from '../../../../core/correo/aplicacion/dto/correo.dto.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { RECURSO_DE_AVISOS } from '../../../dominio/aviso-de-pago.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  bandeja: BandejaDeSalida;
}

/**
 * Detiene un aviso de pago que aún no sale (`pagos.enviar-aviso`). Queda en la auditoría de core con el motivo. Solo
 * cancela avisos de ese pago: el de otro pago o de otra empresa no existe.
 */
export class CancelarAvisoDePago {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado, MotivoDeCancelacionNoValido (400), CorreoNoPendiente (409). */
  ejecutar(
    operador: Operador,
    pagoId: string,
    cancelacion: { correoId: string; motivo: string },
  ): Promise<CorreoResumenDto> {
    const { unidadDeTrabajo, bandeja } = this.dependencias;
    const origen = { recurso: RECURSO_DE_AVISOS, registroId: pagoId };
    return unidadDeTrabajo.ejecutar(operador, () => bandeja.cancelar(operador, origen, cancelacion));
  }
}
