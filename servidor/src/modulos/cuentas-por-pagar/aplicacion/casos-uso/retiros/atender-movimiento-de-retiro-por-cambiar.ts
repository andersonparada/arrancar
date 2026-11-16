import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { MovimientoDeUnRetiro } from '../../../dominio/errores-de-retiros.js';
import { numeroDelRetiro, type RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { AvisoDeMovimientoPorCambiar } from '../pagos/atender-movimiento-por-cambiar.js';
import { AnuladorDelRetiro } from './anulador-del-retiro.js';
import { retiroBloqueado } from './bloqueo-del-retiro.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';
import { ReabridorDelRetiro } from './reabridor-del-retiro.js';

/**
 * Responde al aviso `bancos.movimiento_por_cambiar` (§4.6 del diseño de efectivo), que llega dentro de la transacción de
 * Bancos antes de que cambie nada. Busca el retiro cuyo cheque o nota es ese movimiento, o cuyo depósito de devolución lo
 * es; sin retiro no hace nada (idempotente). Si Bancos anula el cheque o la nota: con pagos vigentes o liquidado se rechaza
 * y, abierto y sin pagos, se anula el retiro con la forma y la fecha del aviso, sin volver a ordenar a Bancos. Si Bancos
 * anula el depósito, el retiro se reabre. Cualquier otro cambio se rechaza. Los eventos se publican al confirmar la
 * transacción de Bancos.
 */
export class AtenderMovimientoDeRetiroPorCambiar {
  private readonly anulador: AnuladorDelRetiro;
  private readonly reabridor: ReabridorDelRetiro;

  constructor(private readonly dependencias: DependenciasDeRetiros) {
    this.anulador = new AnuladorDelRetiro(dependencias);
    this.reabridor = new ReabridorDelRetiro(dependencias);
  }

  /**
   * @throws MovimientoDeUnRetiro, RetiroConPagos, RetiroLiquidado, RetiroCobrado
   */
  async ejecutar(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<void> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.atender(operador, aviso));
    await publicadorEventos.publicar(eventos);
  }

  private async atender(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<EventoDominio[]> {
    const encontrado = await this.dependencias.retiros.delMovimiento(aviso.movimientoId);
    if (!encontrado) return [];
    const retiro = await retiroBloqueado(this.dependencias, encontrado.id);
    const esElDeposito = retiro.movimientoDeDevolucionId === aviso.movimientoId;
    if (aviso.cambio !== 'anular') {
      throw new MovimientoDeUnRetiro(numeroDelRetiro(retiro.numero, retiro.anioDeNumero));
    }
    return esElDeposito ? this.reabrir(operador, retiro, aviso) : this.anular(operador, retiro, aviso);
  }

  private async anular(operador: Operador, retiro: RetiroDeEfectivo, aviso: AvisoDeMovimientoPorCambiar) {
    if (retiro.estado === 'anulado') return [];
    await this.anulador.revisar(retiro);
    return this.anulador.anular(operador, retiro, {
      motivo: aviso.motivo ?? 'Anulado desde Bancos',
      enBancos: aviso.formaDeAnulacion ?? 'sin_inverso',
      fechaDelInverso: aviso.fecha,
    });
  }

  private async reabrir(operador: Operador, retiro: RetiroDeEfectivo, aviso: AvisoDeMovimientoPorCambiar) {
    this.reabridor.revisar(retiro);
    return this.reabridor.reabrir(operador, retiro, {
      motivo: aviso.motivo ?? 'Depósito anulado desde Bancos',
      enBancos: aviso.formaDeAnulacion ?? 'sin_inverso',
      fechaDelInverso: aviso.fecha,
    });
  }
}
