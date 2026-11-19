import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { CambioDeMovimiento, FormaDeAnulacion } from '../../core/contratos/bancos.contratos.js';
import { ModuloDeOrigenInactivo, OrigenDelMovimientoNoCoincide } from '../dominio/errores-de-origen.js';
import { MODULO_CUENTAS_POR_PAGAR, type OrigenDeMovimiento } from '../dominio/origen-de-movimiento.js';
import type { MovimientoDto } from './dto/movimiento.dto.js';
import type { AvisosDeMovimientos } from './puertos/avisos-de-movimientos.js';
import type { ModulosDeOrigen } from './puertos/modulos-de-origen.js';

interface Dependencias {
  avisos: AvisosDeMovimientos;
  modulosDeOrigen: ModulosDeOrigen;
}

export interface CambioPorRevisar {
  movimiento: Pick<MovimientoDto, 'id' | 'moduloDeOrigen' | 'documentoDeOrigenId' | 'marcadaParaCuentasPorPagar'>;
  cambio: CambioDeMovimiento;
  /** Solo en `anular`: cómo se va a anular. */
  formaDeAnulacion?: FormaDeAnulacion;
  motivo?: string;
  fecha?: string;
  /** El módulo que pide el cambio por una orden: no recibe su propio aviso, pero el movimiento debe ser suyo. */
  pedidoPor?: OrigenDeMovimiento;
}

/**
 * Antes de cambiar un movimiento con origen en otro módulo o marcado para Cuentas por pagar (CP4, diseño §6.3; CCL-B1
 * lo generaliza a cualquier módulo): si ese módulo está inactivo no hay quien revise sus reglas y se rechaza; si no, se le manda el aviso
 * `bancos.movimiento_por_cambiar`, que puede rechazar. Un movimiento de Bancos a secas pasa sin avisar.
 */
export class RevisorDeCambios {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws OrigenDelMovimientoNoCoincide si `pedidoPor` no es el origen del movimiento.
   * @throws ModuloDeOrigenInactivo si lo generó o lo marcó un módulo que está inactivo.
   */
  async revisar(operador: Operador, cambio: CambioPorRevisar): Promise<void> {
    const { movimiento, pedidoPor } = cambio;
    if (pedidoPor) return this.exigirQueSeaSuyo(movimiento, pedidoPor);
    if (!movimiento.moduloDeOrigen && !movimiento.marcadaParaCuentasPorPagar) return;
    await this.exigirModuloDeOrigenActivo(operador, movimiento);
    await this.dependencias.avisos.porCambiar(operador, {
      movimientoId: movimiento.id,
      moduloDeOrigen: movimiento.moduloDeOrigen,
      documentoDeOrigenId: movimiento.documentoDeOrigenId,
      cambio: cambio.cambio,
      formaDeAnulacion: cambio.formaDeAnulacion ?? null,
      motivo: cambio.motivo ?? null,
      fecha: cambio.fecha ?? null,
    });
  }

  /** Lo que generó o marcó un módulo no se cambia sin él: es quien revisa si el cambio lo permite. */
  private async exigirModuloDeOrigenActivo(operador: Operador, movimiento: CambioPorRevisar['movimiento']) {
    const modulos = [
      ...(movimiento.moduloDeOrigen ? [movimiento.moduloDeOrigen] : []),
      ...(movimiento.marcadaParaCuentasPorPagar ? [MODULO_CUENTAS_POR_PAGAR] : []),
    ];
    for (const modulo of new Set(modulos)) {
      if (!(await this.dependencias.modulosDeOrigen.estaActivo(operador, modulo))) {
        throw new ModuloDeOrigenInactivo(modulo);
      }
    }
  }

  private exigirQueSeaSuyo(
    { moduloDeOrigen, documentoDeOrigenId }: CambioPorRevisar['movimiento'],
    pedidoPor: OrigenDeMovimiento,
  ) {
    if (moduloDeOrigen !== pedidoPor.modulo || documentoDeOrigenId !== pedidoPor.documentoId) {
      throw new OrigenDelMovimientoNoCoincide();
    }
  }
}
