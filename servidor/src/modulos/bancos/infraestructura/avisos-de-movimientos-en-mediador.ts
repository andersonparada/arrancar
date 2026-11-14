import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/bancos.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { AvisoDeMovimientoPorCambiar, AvisosDeMovimientos } from '../aplicacion/puertos/avisos-de-movimientos.js';

/** Avisa por el mediador; lo escuchan solo los módulos activos en la cuenta. */
export class AvisosDeMovimientosEnMediador implements AvisosDeMovimientos {
  porCambiar(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<void> {
    return mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso);
  }
}
