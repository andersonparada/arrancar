import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { PagoYaAnulado } from '../../../dominio/errores-de-anulacion-de-pagos.js';
import { creoSuMovimiento, type PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import { AnuladorDelPago, type AnulacionHechaEnBancos } from './anulador-del-pago.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';
import { DesgloseDelPago } from './desglose-del-pago.js';
import { LectorDelPago } from './lector-del-pago.js';
import { MODULO_DE_ORIGEN } from './orden-a-bancos.js';

export interface PeticionParaAnularPago {
  pagoId: string;
  motivo: string;
  /** `AAAA-MM-DD`: la fecha del inverso en Bancos si el pago movió dinero; por omisión decide Bancos (hoy). */
  fecha?: string;
}

/** El pago bloqueado, vigente y listo para anular; lo usan este caso de uso y el aviso de Bancos. */
export async function pagoVigenteBloqueado(
  dependencias: Pick<DependenciasDeCambiarPagos, 'pagos'>,
  pagoId: string,
): Promise<PagoConLineas> {
  const pago = await dependencias.pagos.bloquear(pagoId);
  if (!pago) throw new RecursoNoEncontrado('El pago');
  if (pago.estado !== 'vigente') throw new PagoYaAnulado(numeroDelPago(pago.numero, pago.anioDeNumero));
  return pago;
}

/**
 * Anula un pago desde Cuentas por pagar (§5.9, `pagos.anular`): bloquea el pago, corre las reglas (un cheque ya conciliado no
 * se anula), ordena a Bancos anular su cheque o su nota (a la antigua o con inverso; si Bancos lanza, nada cambia), deja el
 * pago `anulado` con su fecha contable, anula sus ajustes de diferencia, audita `anular` con el pago como estaba y publica
 * `pago_anulado` al confirmar. Una nota ligada o la cuenta de apertura no anulan nada en Bancos; la nota ligada recupera su
 * disponible y su reparto por concepto se vuelve a fijar sin este pago.
 */
export class AnularPago {
  private readonly anulador: AnuladorDelPago;
  private readonly lector: LectorDelPago;
  private readonly desglose: DesgloseDelPago;

  constructor(private readonly dependencias: DependenciasDeCambiarPagos) {
    this.anulador = new AnuladorDelPago(dependencias);
    this.lector = new LectorDelPago(dependencias);
    this.desglose = new DesgloseDelPago(dependencias);
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
