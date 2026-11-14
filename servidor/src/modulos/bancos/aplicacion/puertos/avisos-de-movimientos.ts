import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { CambioDeMovimiento, FormaDeAnulacion } from '../../../core/contratos/bancos.contratos.js';

/** Lo que Bancos avisa antes de cambiar un movimiento de otro módulo o marcado para Cuentas por pagar. */
export interface AvisoDeMovimientoPorCambiar {
  movimientoId: string;
  moduloDeOrigen: string | null;
  documentoDeOrigenId: string | null;
  cambio: CambioDeMovimiento;
  /** Solo en `anular`. */
  formaDeAnulacion: FormaDeAnulacion | null;
  motivo: string | null;
  fecha: string | null;
}

/**
 * El aviso `bancos.movimiento_por_cambiar` al módulo de origen: lo escucha dentro de la misma transacción y, si
 * rechaza (lanza), se deshace todo lo que Bancos haya hecho.
 */
export interface AvisosDeMovimientos {
  porCambiar(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<void>;
}
