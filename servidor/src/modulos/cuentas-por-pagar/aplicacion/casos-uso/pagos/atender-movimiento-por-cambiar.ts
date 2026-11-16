import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { CambioDeMovimiento, FormaDeAnulacion } from '../../../../core/contratos/bancos.contratos.js';
import {
  MovimientoConPagosAnulados,
  MovimientoDeCuentasPorPagar,
  MovimientoLigadoAPagos,
} from '../../../dominio/errores-de-anulacion-de-pagos.js';
import type { PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import { AnuladorDelPago } from './anulador-del-pago.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';

/** Lo que trae el aviso `bancos.movimiento_por_cambiar`. */
export interface AvisoDeMovimientoPorCambiar {
  movimientoId: string;
  cambio: CambioDeMovimiento;
  /** Solo en `anular`. */
  formaDeAnulacion: FormaDeAnulacion | null;
  motivo: string | null;
  /** Solo en `anular` con inverso: la fecha del inverso. */
  fecha: string | null;
}

const numeroDe = (pago: PagoConLineas): string => numeroDelPago(pago.numero, pago.anioDeNumero);

/**
 * Responde al aviso `bancos.movimiento_por_cambiar` (§5.9), que llega dentro de la transacción de Bancos antes de que cambie
 * nada. Busca los pagos con ese movimiento: sin ninguno no hace nada (idempotente). Si Bancos lo anula (también el lote de
 * cheques caducos) y el pago es un cheque o una nota que emitió este módulo, corre las reglas y anula el pago con la forma y
 * la fecha que trae el aviso, sin volver a ordenar a Bancos. Cualquier otro cambio, y todo cambio de una nota ligada, se
 * rechaza con su error y Bancos no cambia nada. Los eventos se publican al confirmar la transacción de Bancos.
 */
export class AtenderMovimientoPorCambiar {
  private readonly anulador: AnuladorDelPago;

  constructor(private readonly dependencias: DependenciasDeCambiarPagos) {
    this.anulador = new AnuladorDelPago(dependencias);
  }

  /**
   * @throws MovimientoLigadoAPagos, MovimientoDeCuentasPorPagar, MovimientoConPagosAnulados y lo que rechacen las reglas de
   * anular (PagoCobrado).
   */
  async ejecutar(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<void> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.atender(operador, aviso));
    await publicadorEventos.publicar(eventos);
  }

  private async atender(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<EventoDominio[]> {
    const delMovimiento = await this.dependencias.pagos.delMovimiento(aviso.movimientoId);
    const vigentes = delMovimiento.filter(({ estado }) => estado === 'vigente');
    if (vigentes.length === 0) {
      if (aviso.cambio === 'eliminar' && delMovimiento.length > 0) throw new MovimientoConPagosAnulados();
      return [];
    }
    await this.exigirQueNoEsteLigada(vigentes);
    if (aviso.cambio !== 'anular') throw new MovimientoDeCuentasPorPagar(numeroDe(vigentes[0]!));
    return this.anular(operador, vigentes[0]!, aviso);
  }

  /** Una nota ligada no cambia en Bancos mientras haya pagos que la apliquen. */
  private async exigirQueNoEsteLigada(vigentes: readonly PagoConLineas[]): Promise<void> {
    const ligados = vigentes.filter(({ forma }) => forma === 'nota_ligada');
    if (ligados.length === 0) return;
    const ids = ligados.flatMap(({ lineas }) => lineas.map(({ contrasenaId }) => contrasenaId));
    const contrasenas = await this.dependencias.consultasDePagos.contrasenas(ids);
    const numeros = [...new Set(ids)].map((id) => contrasenas.get(id)?.numero ?? '').filter(Boolean);
    throw new MovimientoLigadoAPagos(numeroDe(ligados[0]!), numeros);
  }

  private async anular(operador: Operador, vigente: PagoConLineas, aviso: AvisoDeMovimientoPorCambiar) {
    const { pagos, reglasParaAnular } = this.dependencias;
    const pago = (await pagos.bloquear(vigente.id))!;
    if (pago.estado !== 'vigente') return [];
    await this.anulador.revisar(pago, reglasParaAnular);
    return this.anulador.anular(operador, pago, {
      motivo: aviso.motivo ?? 'Anulado desde Bancos',
      enBancos: aviso.formaDeAnulacion ?? 'sin_inverso',
      fechaDelInverso: aviso.fecha,
    });
  }
}
