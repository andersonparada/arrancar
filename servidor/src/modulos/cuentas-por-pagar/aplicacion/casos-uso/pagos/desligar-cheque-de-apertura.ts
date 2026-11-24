import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { PagoNoEsChequeDeApertura } from '../../../dominio/errores-de-cheque-de-apertura.js';
import type { PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import { AnuladorDelPago } from './anulador-del-pago.js';
import { pagoVigenteBloqueado } from './anular-pago.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';
import { LectorDelPago } from './lector-del-pago.js';
import { MODULO_DE_ORIGEN } from './orden-a-bancos.js';

/** Lo que el usuario debe saber al desligar: Bancos deja el cheque sin clasificar. */
export const AVISO_DE_CHEQUE_SIN_CLASIFICAR = 'Clasifique el cheque otra vez en Bancos.';

export interface PeticionParaDesligar {
  pagoId: string;
  /** De 1 a 300 caracteres. */
  motivo: string;
}

/**
 * Desliga el posfechado de apertura de su pago sin anular el cheque (diseño CP-AP §2.3, `pagos.desligar-cheques-de-apertura`):
 * el pago queda `anulado` con su propia fecha, como si nunca hubiera existido, y sus cargos vuelven a quedar pendientes. El
 * cheque sigue vigente en Bancos, sin clasificar, y se puede ligar a las facturas correctas. Bloquea primero el cheque en
 * Bancos y después el pago, como al ligar. Audita `anular` con el pago como estaba y publica `pago_anulado`.
 */
export class DesligarChequeDeApertura {
  private readonly anulador: AnuladorDelPago;
  private readonly lector: LectorDelPago;

  constructor(private readonly dependencias: DependenciasDeCambiarPagos) {
    this.anulador = new AnuladorDelPago(dependencias);
    this.lector = new LectorDelPago(dependencias);
  }

  /** @throws MotivoInvalido, RecursoNoEncontrado, PagoYaAnulado, PagoNoEsChequeDeApertura y lo que rechace Bancos. */
  async ejecutar(operador: Operador, pedido: PeticionParaDesligar): Promise<PagoDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.desligar(operador, { ...pedido, motivo }),
    );
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async desligar(operador: Operador, { pagoId, motivo }: PeticionParaDesligar) {
    const { pagos, movimientos, bancos } = this.dependencias;
    const previo = await pagos.buscar(pagoId);
    if (previo?.movimientoId && previo.forma === 'cheque_de_apertura') await movimientos.bloquear(previo.movimientoId);
    const pago = await pagoVigenteBloqueado(this.dependencias, pagoId);
    this.exigirChequeDeApertura(pago);
    await bancos.desligarChequeDeApertura(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: pago.id },
      movimientoId: pago.movimientoId!,
      motivo,
    });
    const eventos: EventoDominio[] = await this.anulador.anular(operador, pago, {
      motivo,
      enBancos: null,
      fechaDelInverso: null,
      fechaContable: pago.fecha,
    });
    const desligado = (await pagos.buscar(pago.id))!;
    const { dto } = await this.lector.leer(operador, desligado);
    return { dto: { ...dto, avisos: [AVISO_DE_CHEQUE_SIN_CLASIFICAR] }, eventos };
  }

  private exigirChequeDeApertura(pago: PagoConLineas): void {
    if (pago.forma !== 'cheque_de_apertura') {
      throw new PagoNoEsChequeDeApertura(numeroDelPago(pago.numero, pago.anioDeNumero));
    }
  }
}
