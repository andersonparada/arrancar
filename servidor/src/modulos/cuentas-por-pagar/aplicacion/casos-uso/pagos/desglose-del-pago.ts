import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { NotaParaLigar } from '../../../dominio/nota-para-ligar.js';
import { creoSuMovimiento, type PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import type { DependenciasDeCambiarPagos, LineaRevisada } from './dependencias-de-pagos.js';
import { conceptosDelPago, MODULO_DE_ORIGEN, repartoPorActivo } from './orden-a-bancos.js';

type Dependencias = Pick<DependenciasDeCambiarPagos, 'bancos' | 'notas' | 'pagos'>;

const deActivoFijo = (lineas: readonly LineaRevisada[]): number =>
  lineas.reduce((suma, { fila, montoCentavos }) => (fila.documento.tieneActivoFijo ? suma + montoCentavos : suma), 0);

/**
 * El reparto por concepto (Operación o Inversión) del cheque o la nota de un pago, que Bancos guarda y Cuentas por pagar
 * manda con `fijar_desglose_de_conceptos`. En una nota ligada el reparto es de la nota entera: suma lo pagado a cargos de
 * activo fijo en todos sus pagos vigentes, y lo no ligado sigue en Operación (§5.2).
 */
export class DesgloseDelPago {
  constructor(private readonly dependencias: Dependencias) {}

  /** Bloquea la nota de Bancos del pago ligado (antes que sus contraseñas y cargos, §10.6); con otra forma, no hace nada. */
  bloquearLaNota(pago: Pick<PagoConLineas, 'forma' | 'movimientoId'>): Promise<NotaParaLigar | null> {
    if (pago.forma !== 'nota_ligada' || pago.movimientoId === null) return Promise.resolve(null);
    return this.dependencias.notas.bloquear(pago.movimientoId);
  }

  /** Vuelve a mandar el reparto de la nota con lo que sus pagos vigentes ligan hoy (idempotente: también al anular). */
  async fijarLaNota(operador: Operador, nota: NotaParaLigar): Promise<void> {
    const { bancos, pagos } = this.dependencias;
    const { deActivoCentavos } = await pagos.ligadoAlMovimiento(nota.movimientoId);
    await bancos.fijarDesglose(operador, {
      origen: null,
      movimientoId: nota.movimientoId,
      conceptos: repartoPorActivo(nota.montoCentavos, deActivoCentavos),
    });
  }

  /** Si al reaplicar cambió lo pagado a cargos de activo fijo, Bancos vuelve a repartir el cheque, la nota o la nota ligada. */
  async alReaplicar(
    operador: Operador,
    pago: PagoConLineas,
    cambio: { antes: readonly LineaRevisada[]; despues: readonly LineaRevisada[]; nota: NotaParaLigar | null },
  ): Promise<void> {
    if (deActivoFijo(cambio.antes) === deActivoFijo(cambio.despues)) return;
    if (cambio.nota) return this.fijarLaNota(operador, cambio.nota);
    if (!creoSuMovimiento(pago) || pago.movimientoId === null) return;
    await this.dependencias.bancos.fijarDesglose(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: pago.id },
      movimientoId: pago.movimientoId,
      conceptos: conceptosDelPago(cambio.despues),
    });
  }
}
