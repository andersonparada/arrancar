import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { CambioDeMovimiento, FormaDeAnulacion } from '../../../../core/contratos/bancos.contratos.js';
import { numeroDelAnticipo, type Anticipo } from '../../../dominio/anticipos.js';
import { MovimientoDeCuentasPorLiquidar } from '../../../dominio/errores-de-anticipos.js';
import { AnuladorDelAnticipo } from './anulador-del-anticipo.js';
import { ReabridorDelAnticipo } from './reabridor-del-anticipo.js';
import { anticipoBloqueado } from './bloqueo-del-anticipo.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';

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

/**
 * Responde al aviso `bancos.movimiento_por_cambiar` (§7.5 del diseño), que llega dentro de la transacción de Bancos antes de
 * que cambie nada. Busca el anticipo cuyo cheque o nota de entrega (o devolución o reembolso) es ese movimiento; sin
 * anticipo no hace nada (idempotente). Si Bancos anula la entrega: con gastos o liquidado se rechaza y, abierto y sin gastos,
 * se anula el anticipo con la forma y la fecha del aviso, sin volver a ordenar a Bancos. Si anula la devolución o el reembolso,
 * el anticipo se reabre. Cualquier otro cambio se rechaza. Los eventos se publican al confirmar la transacción de Bancos.
 */
export class AtenderMovimientoDeAnticipoPorCambiar {
  private readonly anulador: AnuladorDelAnticipo;
  private readonly reabridor: ReabridorDelAnticipo;

  constructor(private readonly dependencias: DependenciasDeAnticipos) {
    this.anulador = new AnuladorDelAnticipo(dependencias);
    this.reabridor = new ReabridorDelAnticipo(dependencias);
  }

  /** @throws MovimientoDeCuentasPorLiquidar, AnticipoConGastos, AnticipoLiquidado, AnticipoCobrado, AnticipoNoLiquidado */
  async ejecutar(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<void> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.atender(operador, aviso));
    await publicadorEventos.publicar(eventos);
  }

  private async atender(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<EventoDominio[]> {
    const encontrado = await this.dependencias.anticipos.delMovimiento(aviso.movimientoId);
    if (!encontrado) return [];
    const anticipo = await anticipoBloqueado(this.dependencias, encontrado.id);
    if (aviso.cambio !== 'anular') {
      throw new MovimientoDeCuentasPorLiquidar(numeroDelAnticipo(anticipo.numero, anticipo.anioDeNumero));
    }
    return anticipo.movimientoId === aviso.movimientoId
      ? this.anular(operador, anticipo, aviso)
      : this.reabrir(operador, anticipo, aviso);
  }

  private async anular(operador: Operador, anticipo: Anticipo, aviso: AvisoDeMovimientoPorCambiar) {
    if (anticipo.estado === 'anulado') return [];
    await this.anulador.revisar(anticipo);
    return this.anulador.anular(operador, anticipo, {
      motivo: aviso.motivo ?? 'Anulado desde Bancos',
      enBancos: aviso.formaDeAnulacion ?? 'sin_inverso',
      fechaDelInverso: aviso.fecha,
    });
  }

  /** Bancos anula la devolución o el reembolso: el anticipo vuelve a quedar abierto (sin volver a ordenar a Bancos). */
  private async reabrir(operador: Operador, anticipo: Anticipo, aviso: AvisoDeMovimientoPorCambiar) {
    this.reabridor.revisar(anticipo);
    return this.reabridor.reabrir(operador, anticipo, {
      motivo: aviso.motivo ?? 'Depósito o reembolso anulado desde Bancos',
      enBancos: aviso.formaDeAnulacion ?? 'sin_inverso',
      fechaDelInverso: aviso.fecha,
    });
  }
}
