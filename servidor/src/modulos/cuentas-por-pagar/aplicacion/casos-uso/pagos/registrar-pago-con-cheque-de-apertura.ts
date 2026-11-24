import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirSoloSaldosInicialesEnLaApertura } from '../../../dominio/anulacion-de-pagos.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import { pedidoEnCentavos, sumaDe } from './comunes-del-registro.js';
import type { DependenciasDeRegistrarPago, LineaRevisada } from './dependencias-de-pagos.js';
import { GuardadorDelPago, type PagoYSusEventos } from './guardador-del-pago.js';
import { conceptosDelPago, MODULO_DE_ORIGEN } from './orden-a-bancos.js';
import type { PeticionDeChequeDeApertura } from './peticion-de-pago.js';
import { RevisorDelPago } from './revisor-del-pago.js';

/**
 * Paga saldos iniciales con un cheque posfechado de la carga inicial que ya estaba en Bancos (diseño CP-AP §2.3,
 * `pagos.ligar-cheques-de-apertura`). El monto es el del cheque y la fecha, la suya: si es posterior a hoy el pago queda
 * comprometido y se da por pagado en ella. Revisa los cargos sin bloquear, ordena a Bancos ligar el cheque (la orden lo
 * bloquea primero, como la nota ligada, y rechaza un monto distinto), bloquea contraseñas y cargos, vuelve a revisarlos y
 * guarda. Sirve con la carga abierta o cerrada: no cambia ningún saldo al corte. Es un alta: no audita.
 */
export class RegistrarPagoConChequeDeApertura {
  private readonly revisor: RevisorDelPago;
  private readonly guardador: GuardadorDelPago;

  constructor(private readonly dependencias: DependenciasDeRegistrarPago) {
    this.revisor = new RevisorDelPago(dependencias);
    this.guardador = new GuardadorDelPago(dependencias);
  }

  /**
   * @throws SoloSaldosIniciales, los de cargos y montos del pago (otro proveedor, sin autorizar, fuera de la contraseña,
   * mayor que el saldo) y los de Bancos (ChequeDeAperturaNoLigable, MontoDistintoDelCheque).
   */
  async ejecutar(operador: Operador, pedido: PeticionDeChequeDeApertura): Promise<PagoDto> {
    const pedidas = pedidoEnCentavos(pedido);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.registrar(operador, pedido, pedidas));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async registrar(
    operador: Operador,
    pedido: PeticionDeChequeDeApertura,
    { lineas }: ReturnType<typeof pedidoEnCentavos>,
  ): Promise<PagoYSusEventos> {
    const { cargaInicial, reloj } = this.dependencias;
    const { fechaDeInicio } = await cargaInicial.obtener(operador);
    const previas = await this.revisor.revisar(pedido.proveedorId, lineas);
    exigirSoloSaldosInicialesEnLaApertura(
      { forma: 'cheque_de_apertura' },
      previas.map(({ fila }) => fila.documento.origen),
    );
    const pagoId = crypto.randomUUID();
    const movimiento = await this.ligarEnBancos(operador, { pedido, pagoId, previas });
    const bloqueado = await this.revisor.bloquearYRevisar(pedido.proveedorId, lineas, previas);
    const beneficiario = bloqueado.lineas[0]!.fila.libro.proveedorNombre;
    return this.guardador.guardar(operador, {
      ...{ pedido, pagoId, fecha: movimiento.fecha, hoy: await reloj.hoy(operador), beneficiario, movimiento },
      ...{ bloqueado, diferencias: [], fechaDeInicio },
    });
  }

  /** Bancos bloquea el cheque, comprueba que sea el monto y se lo entrega al pago; la fecha del pago es la del cheque. */
  private ligarEnBancos(
    operador: Operador,
    { pedido, pagoId, previas }: { pedido: PeticionDeChequeDeApertura; pagoId: string; previas: LineaRevisada[] },
  ): Promise<MovimientoCreado & { fecha: string }> {
    return this.beneficiario(pedido.proveedorId, previas).then((beneficiarioEsperado) =>
      this.dependencias.bancos.ligarChequeDeApertura(operador, {
        origen: { modulo: MODULO_DE_ORIGEN, documentoId: pagoId },
        movimientoId: pedido.movimientoId,
        montoCentavos: sumaDe(previas),
        beneficiarioEsperado,
        conceptos: conceptosDelPago(previas),
      }),
    );
  }

  /** El nombre del NIT del proveedor con que Bancos compara el beneficiario del cheque; si falta, su nombre en Terceros. */
  private async beneficiario(proveedorId: string, lineas: readonly LineaRevisada[]): Promise<string> {
    const nombre = await this.dependencias.nombreDelNit.de(
      proveedorId,
      lineas.map(({ fila }) => fila.documento.id),
    );
    return nombre ?? lineas[0]!.fila.libro.proveedorNombre;
  }
}
