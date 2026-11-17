import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { PagoYaAnulado } from '../../../dominio/errores-de-anulacion-de-pagos.js';
import { creoSuMovimiento, type PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import { retiroBloqueado } from '../retiros/bloqueo-del-retiro.js';
import { AnuladorDelPago, type AnulacionHechaEnBancos } from './anulador-del-pago.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';
import { DesgloseDelPago } from './desglose-del-pago.js';
import { DesgloseDelPagoEnEfectivo } from './desglose-del-pago-en-efectivo.js';
import { LectorDelPago } from './lector-del-pago.js';
import { MODULO_DE_ORIGEN } from './orden-a-bancos.js';

export interface PeticionParaAnularPago {
  pagoId: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha del inverso en Bancos si el pago movió dinero; por omisión decide Bancos (hoy). */
  fecha?: string;
}

/**
 * El pago bloqueado, vigente y listo para cambiar. Un pago en efectivo bloquea antes el cheque o la nota de su retiro y el
 * retiro (Bancos antes que Cuentas por pagar, y el retiro antes que el pago: el mismo orden de repartir un retiro).
 */
export async function pagoVigenteBloqueado(
  dependencias: Pick<DependenciasDeCambiarPagos, 'pagos' | 'retiros' | 'movimientos'>,
  pagoId: string,
): Promise<PagoConLineas> {
  const existente = await dependencias.pagos.buscar(pagoId);
  if (existente?.retiroId) await retiroBloqueado(dependencias, existente.retiroId);
  const pago = await dependencias.pagos.bloquear(pagoId);
  if (!pago) throw new RecursoNoEncontrado('El pago');
  if (pago.estado !== 'vigente') throw new PagoYaAnulado(numeroDelPago(pago.numero, pago.anioDeNumero));
  return pago;
}

/**
 * Anula un pago desde Cuentas por pagar (§5.9, `pagos.anular`): bloquea el pago, corre las reglas (un cheque ya conciliado no
 * se anula), ordena a Bancos anular su cheque o su nota (a la antigua o con inverso; si Bancos lanza, nada cambia), deja el
 * pago `anulado` con su fecha contable, anula sus ajustes de diferencia, audita `anular` con el pago como estaba y publica
 * `pago_anulado` al confirmar. Una nota ligada, la cuenta de apertura y el efectivo no anulan nada en Bancos; la nota ligada
 * y el retiro del efectivo recuperan su disponible y su reparto por concepto se vuelve a fijar sin este pago. Un pago en
 * efectivo de un retiro ya liquidado no se anula (`RetiroLiquidado`): primero se reabre el retiro.
 */
export class AnularPago {
  private readonly anulador: AnuladorDelPago;
  private readonly lector: LectorDelPago;
  private readonly desglose: DesgloseDelPago;
  private readonly desgloseEnEfectivo: DesgloseDelPagoEnEfectivo;

  constructor(private readonly dependencias: DependenciasDeCambiarPagos) {
    this.anulador = new AnuladorDelPago(dependencias);
    this.lector = new LectorDelPago(dependencias);
    this.desglose = new DesgloseDelPago(dependencias);
    this.desgloseEnEfectivo = new DesgloseDelPagoEnEfectivo(dependencias);
  }

  /**
   * @throws MotivoInvalido, RecursoNoEncontrado, PagoYaAnulado, PagoCobrado y lo que rechace Bancos (mes conciliado del
   * inverso, sobregiro).
   */
  async ejecutar(operador: Operador, pedido: PeticionParaAnularPago): Promise<PagoDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.anular(operador, { ...pedido, motivo }),
    );
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async anular(operador: Operador, pedido: PeticionParaAnularPago) {
    const { pagos, reglasParaAnular } = this.dependencias;
    const pago = await pagoVigenteBloqueado(this.dependencias, pedido.pagoId);
    const nota = await this.desglose.bloquearLaNota(pago);
    await this.anulador.revisar(pago, reglasParaAnular);
    const enBancos = await this.anularEnBancos(operador, pago, pedido);
    const eventos: EventoDominio[] = await this.anulador.anular(operador, pago, { motivo: pedido.motivo, ...enBancos });
    if (nota) await this.desglose.fijarLaNota(operador, nota);
    await this.desgloseEnEfectivo.fijar(operador, pago);
    const anulado = (await pagos.buscar(pago.id))!;
    return { dto: (await this.lector.leer(operador, anulado)).dto, eventos };
  }

  /** La orden a Bancos si el pago creó su cheque o su nota; las otras formas no tienen nada que anular allá. */
  private async anularEnBancos(
    operador: Operador,
    pago: PagoConLineas,
    { motivo, fecha }: PeticionParaAnularPago,
  ): Promise<AnulacionHechaEnBancos> {
    if (!creoSuMovimiento(pago) || pago.movimientoId === null) return { enBancos: null, fechaDelInverso: null };
    const hecha = await this.dependencias.bancos.anularMovimiento(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: pago.id },
      movimientoId: pago.movimientoId,
      motivo: `Anulado desde Cuentas por pagar: ${motivo}`,
      ...(fecha ? { fecha } : {}),
    });
    return { enBancos: hecha.forma, fechaDelInverso: hecha.fechaDelInverso };
  }
}
