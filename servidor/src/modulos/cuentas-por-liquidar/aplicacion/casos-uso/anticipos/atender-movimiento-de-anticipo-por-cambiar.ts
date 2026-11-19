import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { CambioDeMovimiento, FormaDeAnulacion } from '../../../../core/contratos/bancos.contratos.js';
import { numeroDelAnticipo } from '../../../dominio/anticipos.js';
import { MovimientoDeCuentasPorLiquidar } from '../../../dominio/errores-de-anticipos.js';
import { AnuladorDelAnticipo } from './anulador-del-anticipo.js';
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
 * se anula el anticipo con la forma y la fecha del aviso, sin volver a ordenar a Bancos. Cualquier otro cambio se rechaza
 * (la devolución y el reembolso reabrirán el anticipo en CL-4). Los eventos se publican al confirmar la transacción de Bancos.
 */
export class AtenderMovimientoDeAnticipoPorCambiar {
  private readonly anulador: AnuladorDelAnticipo;

  constructor(private readonly dependencias: DependenciasDeAnticipos) {
    this.anulador = new AnuladorDelAnticipo(dependencias);
  }

  /** @throws MovimientoDeCuentasPorLiquidar, AnticipoConGastos, AnticipoLiquidado, AnticipoCobrado */
  async ejecutar(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<void> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.atender(operador, aviso));
    await publicadorEventos.publicar(eventos);
  }

  private async atender(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<EventoDominio[]> {
    const encontrado = await this.dependencias.anticipos.delMovimiento(aviso.movimientoId);
    if (!encontrado) return [];
    const anticipo = await anticipoBloqueado(this.dependencias, encontrado.id);
    const esLaEntrega = anticipo.movimientoId === aviso.movimientoId;
    if (aviso.cambio !== 'anular' || !esLaEntrega) {
      throw new MovimientoDeCuentasPorLiquidar(numeroDelAnticipo(anticipo.numero, anticipo.anioDeNumero));
    }
    if (anticipo.estado === 'anulado') return [];
    await this.anulador.revisar(anticipo);
    return this.anulador.anular(operador, anticipo, {
      motivo: aviso.motivo ?? 'Anulado desde Bancos',
      enBancos: aviso.formaDeAnulacion ?? 'sin_inverso',
      fechaDelInverso: aviso.fecha,
    });
  }
}
