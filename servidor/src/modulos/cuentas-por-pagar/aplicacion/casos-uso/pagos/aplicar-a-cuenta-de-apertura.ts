import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirSaldosConMovimientos, fechaDeLaApertura } from '../../../dominio/apertura-de-pagos.js';
import { exigirSoloSaldosInicialesEnLaApertura } from '../../../dominio/anulacion-de-pagos.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import { RECURSO_DE_PAGOS } from './anulador-del-pago.js';
import { pedidoEnCentavos } from './comunes-del-registro.js';
import type { DependenciasDeRegistrarPago } from './dependencias-de-pagos.js';
import { GuardadorDelPago, type PagoYSusEventos } from './guardador-del-pago.js';
import type { PeticionDeApertura } from './peticion-de-pago.js';
import { RevisorDelPago, type PagoBloqueado } from './revisor-del-pago.js';

/**
 * Da por pagados saldos iniciales sin dinero, con la cuenta de apertura (§5.3, `pagos.aplicar-a-apertura`): la excepción para lo
 * que ya estaba pagado antes de la fecha de inicio. Todos los cargos son saldos iniciales autorizados y en una contraseña
 * vigente. Con la carga abierta, la fecha es la de inicio y el saldo debe tener movimientos (si no, se corrige en Saldos
 * iniciales); con la carga cerrada es una corrección de error con la fecha elegida. No ordena nada a Bancos, no descuenta
 * retenciones (el saldo ya viene neto) y no cuenta para la bancarización. Audita `ajustar` con las fichas de los cargos
 * antes del pago y el motivo, en la misma transacción.
 */
export class AplicarACuentaDeApertura {
  private readonly revisor: RevisorDelPago;
  private readonly guardador: GuardadorDelPago;

  constructor(private readonly dependencias: DependenciasDeRegistrarPago) {
    this.revisor = new RevisorDelPago(dependencias);
    this.guardador = new GuardadorDelPago(dependencias);
  }

  /**
   * @throws MotivoInvalido, SoloSaldosIniciales, CorrijaElSaldoInicial, FechaDeAperturaInvalida y los de cargos y montos del
   * pago (cargos fuera de la contraseña o sin autorizar, monto mayor que el saldo).
   */
  async ejecutar(operador: Operador, pedido: PeticionDeApertura): Promise<PagoDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.aplicar(operador, { ...pedido, motivo }),
    );
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async aplicar(operador: Operador, pedido: PeticionDeApertura): Promise<PagoYSusEventos> {
    const { cargaInicial, reloj } = this.dependencias;
    const { lineas } = pedidoEnCentavos(pedido);
    const { fechaDeInicio, cerrada } = await cargaInicial.obtener(operador);
    const previas = await this.revisor.revisar(pedido.proveedorId, lineas);
    exigirSoloSaldosInicialesEnLaApertura(
      { forma: 'cuenta_de_apertura' },
      previas.map(({ fila }) => fila.documento.origen),
    );
    const hoy = await reloj.hoy(operador);
    const fecha = fechaDeLaApertura({ cargaCerrada: cerrada, fechaDeInicio, fecha: pedido.fecha, hoy });
    const bloqueado = await this.revisor.bloquearYRevisar(pedido.proveedorId, lineas, previas);
    if (!cerrada) exigirSaldosConMovimientos(bloqueado.lineas.map(({ fila }) => fila));
    const beneficiario = bloqueado.lineas[0]!.fila.libro.proveedorNombre;
    const por = { pedido, pagoId: crypto.randomUUID(), fecha, hoy, beneficiario, movimiento: null, bloqueado };
    const guardado = await this.guardador.guardar(operador, {
      ...por,
      ...{ diferencias: [], fechaDeInicio, conCargaCerrada: cerrada },
    });
    await this.auditar(guardado.dto.id, { bloqueado, motivo: pedido.motivo });
    return guardado;
  }

  /** Dar por pagada una deuda sin dinero se audita como `ajustar`, con los cargos como estaban (como el ajuste de U13). */
  private auditar(pagoId: string, { bloqueado, motivo }: { bloqueado: PagoBloqueado; motivo: string }): Promise<void> {
    return this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_PAGOS,
      registroId: pagoId,
      accion: 'ajustar',
      anterior: [...bloqueado.guardados.values()].map(dtoDeFicha),
      motivo,
    });
  }
}
