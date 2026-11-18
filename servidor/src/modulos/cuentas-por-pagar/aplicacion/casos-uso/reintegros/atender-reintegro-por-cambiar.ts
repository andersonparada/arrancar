import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { MovimientoConReintegroAnulado, MovimientoDeUnReintegro } from '../../../dominio/errores-de-reintegros.js';
import { numeroDelReintegro, type Reintegro } from '../../../dominio/reintegros.js';
import type { AvisoDeMovimientoPorCambiar } from '../pagos/atender-movimiento-por-cambiar.js';
import { AnuladorDelReintegro } from './anulador-del-reintegro.js';
import { reintegroBloqueado } from './bloqueo-del-reintegro.js';
import type { DependenciasDeReintegros } from './dependencias-de-reintegros.js';

/**
 * Responde al aviso `bancos.movimiento_por_cambiar` (§5.10 del diseño de CP4), que llega dentro de la transacción de
 * Bancos antes de que cambie nada. Busca el reintegro cuya nota de crédito es ese movimiento; sin reintegro no hace nada
 * (idempotente). Si Bancos anula la nota, el reintegro se anula con la forma y la fecha del aviso, sin volver a ordenar a
 * Bancos. Cualquier otro cambio se rechaza (y eliminar una nota que solo tuvo un reintegro anulado, también). Los eventos
 * se publican al confirmar la transacción de Bancos.
 */
export class AtenderReintegroPorCambiar {
  private readonly anulador: AnuladorDelReintegro;

  constructor(private readonly dependencias: DependenciasDeReintegros) {
    this.anulador = new AnuladorDelReintegro(dependencias);
  }

  /** @throws MovimientoDeUnReintegro, MovimientoConReintegroAnulado */
  async ejecutar(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<void> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.atender(operador, aviso));
    await publicadorEventos.publicar(eventos);
  }

  private async atender(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<EventoDominio[]> {
    const encontrado = await this.dependencias.reintegros.delMovimiento(aviso.movimientoId);
    if (!encontrado) return [];
    const reintegro = await reintegroBloqueado(this.dependencias, encontrado.id);
    if (aviso.cambio === 'anular') return this.anular(operador, reintegro, aviso);
    this.exigirQueSePuedaCambiar(reintegro, aviso);
    return [];
  }

  private async anular(operador: Operador, reintegro: Reintegro, aviso: AvisoDeMovimientoPorCambiar) {
    if (reintegro.estado === 'anulado') return [];
    return this.anulador.anular(operador, reintegro, {
      motivo: aviso.motivo ?? 'Anulado desde Bancos',
      enBancos: aviso.formaDeAnulacion ?? 'sin_inverso',
      fechaDelInverso: aviso.fecha,
    });
  }

  /** Un reintegro vigente no deja cambiar su nota; uno anulado deja todo salvo eliminarla (la llave lo exige). */
  private exigirQueSePuedaCambiar(reintegro: Reintegro, aviso: AvisoDeMovimientoPorCambiar): void {
    if (reintegro.estado === 'vigente') {
      throw new MovimientoDeUnReintegro(numeroDelReintegro(reintegro.numero, reintegro.anioDeNumero));
    }
    if (aviso.cambio === 'eliminar') throw new MovimientoConReintegroAnulado();
  }
}
