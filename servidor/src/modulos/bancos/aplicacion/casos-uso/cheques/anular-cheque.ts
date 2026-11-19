import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CLAVE_DE_ANULACION_DE_APERTURA } from '../../../dominio/anulacion-de-apertura.js';
import type { CausaDeAnulacion } from '../../../dominio/cheque.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import { eventoDeAperturaAnulada } from '../../evento-de-apertura-anulada.js';
import { numerarSiCorresponde } from '../../numeracion-de-comprobantes.js';
import type { OrigenDeMovimiento } from '../../../dominio/origen-de-movimiento.js';
import type { ChequeDto } from '../../dto/cheque.dto.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import { chequeExistente, type DependenciasDeCheques } from './dependencias-de-cheques.js';

export interface AnulacionDeCheque {
  chequeId: string;
  motivo: string;
  /** Por omisión `manual`; el proceso de cheques caducos (H6b) pasa `caducidad`. El inverso hereda el concepto del cheque en ambos casos. */
  causa?: CausaDeAnulacion;
  /** Solo se usa si hay inverso (mes conciliado, lote o cheque de la carga inicial): su fecha. Por omisión, hoy en la zona horaria de la empresa. */
  fecha?: string;
  /** La anulación en lote de caducos (H6b): siempre nota inversa, aunque el mes del cheque siga abierto. */
  conInversoSiempre?: boolean;
  /** El módulo de origen que pide la anulación por una orden: no recibe su propio aviso (CP4). */
  pedidoPor?: OrigenDeMovimiento;
}

/** El cheque anulado y los eventos que se publican cuando la transacción se confirme. */
export interface ChequeAnulado {
  cheque: ChequeDto;
  eventos: EventoDominio[];
}

/**
 * Anula el cheque, disponible o emitido; conserva su número: no se vuelve a usar. Si estaba emitido
 * y su mes sigue abierto, anula su movimiento a la antigua (sin inverso, fuera del saldo, como
 * siempre). Si su mes ya está conciliado (quedó en circulación y nunca se cobró), en cambio, crea
 * su nota de crédito inversa: el movimiento original sigue contando y el inverso lo compensa, así
 * no cambia ninguna conciliación ya autorizada. Lo mismo si el banco ya lo pagó antes de su fecha (marcado en una
 * conciliación, con fecha posterior a ella). Un cheque en circulación de la carga inicial siempre
 * lleva inverso, con la fecha posterior al corte y el concepto «Partidas de apertura anuladas»; de eso se avisa al
 * confirmar (`bancos.partida_de_apertura_anulada`).
 */
export class AnularCheque {
  constructor(private readonly dependencias: DependenciasDeCheques) {}

  /**
   * @throws ChequeAnulado si ya estaba anulado; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws SaldoInsuficiente si al anularlo o revertirlo la cuenta queda en negativo sin sobregiro permitido.
   * @throws InversoDentroDeLaApertura si es de la carga inicial y la fecha del inverso no es posterior al corte.
   * @throws ModuloDeOrigenInactivo o lo que rechace el módulo de origen si el cheque es de otro módulo (CP4).
   */
  async ejecutar(operador: Operador, solicitud: AnulacionDeCheque): Promise<ChequeDto> {
    const { cheque, eventos } = await this.anularSinPublicar(operador, solicitud);
    await this.dependencias.publicadorEventos.publicar(eventos);
    return cheque;
  }

  /** Lo mismo que `ejecutar`, pero devuelve los eventos: quien anula dentro de una transacción mayor los publica al confirmar. */
  anularSinPublicar(operador: Operador, solicitud: AnulacionDeCheque): Promise<ChequeAnulado> {
    const { chequeId, motivo, causa } = solicitud;
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cheque = await chequeExistente(repositorio, chequeId);
      const anterior = await consultas.obtener(chequeId);
      const { movimientoId, numero } = cheque.instantanea();

      cheque.anular(motivo, causa);
      const eventos = movimientoId
        ? await this.anularOrevertirSuMovimiento(operador, movimientoId, { ...solicitud, numero })
        : [];
      await repositorio.guardar(cheque);

      await auditoria.registrar({
        recurso: 'bancos.cheques',
        registroId: chequeId,
        accion: 'anular',
        anterior,
        motivo: cheque.instantanea().motivoDeAnulacion,
      });
      return { cheque: await consultas.obtener(chequeId), eventos };
    });
  }

  private async anularOrevertirSuMovimiento(
    operador: Operador,
    movimientoId: string,
    solicitud: AnulacionDeCheque & { numero: number },
  ): Promise<EventoDominio[]> {
    const { motivo, fecha, conInversoSiempre } = solicitud;
    const movimiento = await movimientoExistente(this.dependencias.repositorioMovimientos, movimientoId);
    const deLaApertura = movimiento.parteDeApertura === 'cheque_en_circulacion';
    const conInverso =
      deLaApertura || conInversoSiempre === true || (await this.estaConciliado(movimiento, movimientoId));
    const fechaDelInverso = conInverso ? await this.fechaDelInverso(operador, { fecha, deLaApertura }) : undefined;
    await this.avisarAlOrigen(operador, { ...solicitud, movimientoId, fecha: fechaDelInverso });
    if (!fechaDelInverso) {
      await this.anularALaAntigua(operador, movimiento, motivo);
      return [];
    }
    const inverso = await this.revertir(operador, movimiento, { motivo, fecha: fechaDelInverso, deLaApertura });
    if (!deLaApertura) return [];
    return [eventoDeAperturaAnulada(movimiento, inverso, { numeroDeCheque: solicitud.numero, pagador: null })];
  }

  /** Si el cheque es de otro módulo o está marcado, ese módulo revisa la anulación antes de hacerla (CP4). */
  private async avisarAlOrigen(
    operador: Operador,
    solicitud: Pick<AnulacionDeCheque, 'motivo' | 'fecha' | 'pedidoPor'> & { movimientoId: string },
  ): Promise<void> {
    const { movimientoId, motivo, fecha, pedidoPor } = solicitud;
    await this.dependencias.revisor.revisar(operador, {
      movimiento: await this.dependencias.consultasMovimientos.obtener(movimientoId),
      cambio: 'anular',
      formaDeAnulacion: fecha ? 'con_inverso' : 'sin_inverso',
      motivo,
      fecha,
      pedidoPor,
    });
  }

  /** Su mes está conciliado o el banco ya lo pagó (marcado en una conciliación, aunque su fecha sea posterior). */
  private async estaConciliado(movimiento: Movimiento, movimientoId: string): Promise<boolean> {
    const { fecha, cuentaBancariaId } = movimiento.instantanea();
    const { conciliacionId } = await this.dependencias.consultasMovimientos.obtener(movimientoId);
    if (conciliacionId) return true;
    const conciliadaHasta = await this.dependencias.consultasMovimientos.conciliadaHasta(cuentaBancariaId);
    return conciliadaHasta !== null && fecha <= conciliadaHasta;
  }

  /** La que escribió el usuario o, por omisión, hoy; la de una partida de la carga inicial debe ser posterior al corte. */
  private async fechaDelInverso(
    operador: Operador,
    { fecha, deLaApertura }: { fecha?: string; deLaApertura: boolean },
  ): Promise<string> {
    const { reloj, reglas } = this.dependencias;
    const elegida = fecha ?? (await reloj.hoy(operador));
    if (deLaApertura) await reglas.revisarElInversoDeApertura(operador, elegida);
    return elegida;
  }

  private async anularALaAntigua(operador: Operador, movimiento: Movimiento, motivo: string): Promise<void> {
    const { repositorioMovimientos, reglas } = this.dependencias;
    const efectoAnterior = movimiento.efectoEnCentavos;
    const { fecha, cuentaBancariaId } = movimiento.instantanea();
    movimiento.anularPorCheque(motivo);
    await reglas.revisar(operador, { cuentaBancariaId, fechas: [fecha], diferencia: -efectoAnterior });
    await repositorioMovimientos.guardar(movimiento);
  }

  private async revertir(
    operador: Operador,
    movimiento: Movimiento,
    { motivo, fecha, deLaApertura }: { motivo: string; fecha: string; deLaApertura: boolean },
  ): Promise<Movimiento> {
    const { repositorioMovimientos, reglas, correlativos } = this.dependencias;
    const inverso = deLaApertura
      ? movimiento.revertirPartidaDeApertura(fecha, motivo, {
          conceptoId: await this.conceptoDeLaAnulacionDeApertura(operador),
          pagador: null,
        })
      : movimiento.revertirPorCheque(fecha, motivo);
    const { cuentaBancariaId } = movimiento.instantanea();
    await reglas.revisar(operador, { cuentaBancariaId, fechas: [fecha], diferencia: inverso.efectoEnCentavos });
    await numerarSiCorresponde(correlativos, inverso);
    await repositorioMovimientos.guardar(movimiento);
    await repositorioMovimientos.agregar(inverso);
    return inverso;
  }

  private async conceptoDeLaAnulacionDeApertura(operador: Operador): Promise<string> {
    const concepto = await this.dependencias.conceptos.deSistema(operador, CLAVE_DE_ANULACION_DE_APERTURA);
    return concepto.id.valor;
  }
}
