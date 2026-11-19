import type { BandejaDeSalida } from '../../../../core/correo/aplicacion/bandeja-de-salida.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { MOTIVO_DE_CANCELACION_POR_ANULACION, RECURSO_DE_AVISOS } from '../../../dominio/aviso-de-pago.js';
import type { OperadorDelUsuario } from '../../puertos/puertos-de-avisos-de-pago.js';

/** Lo que el evento `cuentas-por-pagar.pago_anulado` dice del pago. */
export interface PagoAnulado {
  empresaId: string;
  cuentaId: string;
  usuarioId: string;
  pagoId: string;
}

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  bandeja: BandejaDeSalida;
  operadores: OperadorDelUsuario;
}

/**
 * Un pago anulado ya no se avisa: cancela los avisos **pendientes** (cada uno con su auditoría y el motivo «Pago
 * anulado»). Lo que ya salió no se puede detener: la ficha le recuerda al usuario que avise al proveedor.
 */
export class CancelarAvisosDePagoAnulado {
  constructor(private readonly dependencias: Dependencias) {}

  /** @returns cuántos avisos canceló. */
  async ejecutar(pago: PagoAnulado): Promise<number> {
    const { operadores, unidadDeTrabajo, bandeja } = this.dependencias;
    const operador = await operadores.de(pago.usuarioId, pago.empresaId);
    if (!operador) return 0;
    const origen = { recurso: RECURSO_DE_AVISOS, registroId: pago.pagoId };
    return unidadDeTrabajo.ejecutar(operador, () =>
      bandeja.cancelarPendientesDe(operador, origen, MOTIVO_DE_CANCELACION_POR_ANULACION),
    );
  }
}
