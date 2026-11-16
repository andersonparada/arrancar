import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { avisoDeNotaDeAnioAnterior } from '../../../dominio/avisos-de-pagos.js';
import {
  disponibleDeLaNota,
  exigirFechaDeLaAplicacion,
  exigirNotaLigable,
  exigirQueCabeEnLaNota,
  type NotaParaLigar,
} from '../../../dominio/nota-para-ligar.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import {
  exigirDiferenciasDelPago,
  fechaMinimaDeLasLineas,
  pedidoEnCentavos,
  sumaDe,
  type PedidoEnCentavos,
} from './comunes-del-registro.js';
import type { DependenciasDeRegistrarPago, LineaRevisada } from './dependencias-de-pagos.js';
import { DesgloseDelPago } from './desglose-del-pago.js';
import { GuardadorDelPago, type PagoPorGuardar, type PagoYSusEventos } from './guardador-del-pago.js';
import type { PeticionDeNotaLigada } from './peticion-de-pago.js';
import { RevisorDelPago } from './revisor-del-pago.js';

const laMayor = (una: string, otra: string): string => (una > otra ? una : otra);

/** La nota de Bancos como el «movimiento» del pago: no se crea nada allá, solo se avisa si es de otro año. */
function movimientoDeLaNota(nota: NotaParaLigar, fecha: string): MovimientoCreado {
  return {
    movimientoId: nota.movimientoId,
    cuentaBancariaId: nota.cuentaBancariaId,
    numero: nota.numero ?? 0,
    avisos: avisoDeNotaDeAnioAnterior(nota.fecha, fecha).map((mensaje) => ({
      codigo: 'nota_de_anio_anterior',
      mensaje,
    })),
  };
}

/**
 * Paga con una nota de débito que ya estaba en Bancos, marcada para Cuentas por pagar (§5.2, `pagos.ligar-notas-de-debito`):
 * una nota cubre varios pagos, hasta lo que le queda por aplicar. No ordena nada a Bancos para crear: bloquea la nota
 * primero (Bancos antes que Cuentas por pagar), revisa los cargos como cualquier pago, guarda el pago con la nota como su
 * movimiento y, con la nota bloqueada, vuelve a fijar su reparto entre Operación e Inversión según los cargos de activo
 * fijo de todos sus pagos. La retención de cada cargo se descuenta igual que en un cheque; si la hay, avisa que el banco
 * debitó la nota sin descontarla. La fecha es la de aplicar la nota: hoy por omisión, nunca futura.
 */
export class LigarNotaDeDebito {
  private readonly revisor: RevisorDelPago;
  private readonly guardador: GuardadorDelPago;
  private readonly desglose: DesgloseDelPago;

  constructor(private readonly dependencias: DependenciasDeRegistrarPago) {
    this.revisor = new RevisorDelPago(dependencias);
    this.guardador = new GuardadorDelPago(dependencias);
    this.desglose = new DesgloseDelPago(dependencias);
  }

  /**
   * @throws MovimientoNoLigable, PagoMayorQueLaNota, FechaDeAplicacionInvalida y los del pago con cheque (cargos, montos y
   * diferencias).
   */
  async ejecutar(operador: Operador, pedido: PeticionDeNotaLigada): Promise<PagoDto> {
    const pedidas = pedidoEnCentavos(pedido);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.ligar(operador, pedido, pedidas));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async ligar(operador: Operador, pedido: PeticionDeNotaLigada, pedidas: PedidoEnCentavos) {
    const { cargaInicial, reloj, notas } = this.dependencias;
    const { fechaDeInicio } = await cargaInicial.obtener(operador);
    const nota = await notas.bloquear(pedido.movimientoId);
    exigirNotaLigable(nota);
    const previas = await this.revisor.revisar(pedido.proveedorId, pedidas.lineas);
    await this.exigirDiferencias(operador, previas, pedidas);
    const restante = await this.exigirQueCabe(nota, sumaDe(previas));
    const hoy = await reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    const minima = laMayor(fechaMinimaDeLasLineas(previas, fechaDeInicio), nota.fecha);
    exigirFechaDeLaAplicacion(fecha, { minima, hoy });
    const bloqueado = await this.revisor.bloquearYRevisar(pedido.proveedorId, pedidas.lineas, previas);
    await this.exigirDiferencias(operador, bloqueado.lineas, pedidas);
    const por = { pedido, fecha, hoy, bloqueado, diferencias: pedidas.diferencias, fechaDeInicio };
    return this.guardar(operador, nota, { ...por, restanteDeLaNotaCentavos: restante });
  }

  private exigirDiferencias(operador: Operador, lineas: readonly LineaRevisada[], { diferencias }: PedidoEnCentavos) {
    return exigirDiferenciasDelPago(this.dependencias.topeDeDiferencia, operador, { lineas, diferencias });
  }

  /** Guarda el pago con la nota como su movimiento y, con ella bloqueada, vuelve a fijar su reparto por concepto. */
  private async guardar(
    operador: Operador,
    nota: NotaParaLigar,
    por: Omit<PagoPorGuardar, 'pagoId' | 'beneficiario' | 'movimiento'>,
  ): Promise<PagoYSusEventos> {
    const beneficiario = nota.beneficiario ?? por.bloqueado.lineas[0]!.fila.libro.proveedorNombre;
    const movimiento = movimientoDeLaNota(nota, por.fecha);
    const guardado = await this.guardador.guardar(operador, {
      ...por,
      ...{ pagoId: crypto.randomUUID(), beneficiario, movimiento },
    });
    await this.desglose.fijarLaNota(operador, nota);
    return guardado;
  }

  /** Lo que le queda a la nota después de este pago; con la nota bloqueada, nadie más lo cambia. */
  private async exigirQueCabe(nota: NotaParaLigar, montoCentavos: number): Promise<number> {
    const { totalCentavos } = await this.dependencias.pagos.ligadoAlMovimiento(nota.movimientoId);
    const disponibleCentavos = disponibleDeLaNota(nota.montoCentavos, totalCentavos);
    exigirQueCabeEnLaNota(nota, { disponibleCentavos, montoCentavos });
    return disponibleCentavos - montoCentavos;
  }
}
