import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import { CLAVE_DE_ANULACION_DE_APERTURA } from '../../../dominio/anulacion-de-apertura.js';
import type { Movimiento } from '../../../dominio/movimiento.js';
import { numerarSiCorresponde } from '../../numeracion-de-comprobantes.js';
import type { OrigenDeMovimiento } from '../../../dominio/origen-de-movimiento.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import type { PoliticaDeMismaFechaEnAnulacion } from '../../puertos/politica-de-misma-fecha-en-anulacion.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

/** Lo que usa `AnularMovimiento`: lo de los movimientos, más la política de misma fecha. */
export interface DependenciasDeAnularMovimiento extends DependenciasDeMovimientos {
  politicaDeMismaFecha: PoliticaDeMismaFechaEnAnulacion;
  reloj: Reloj;
}

interface AnulacionDeMovimiento {
  movimientoId: string;
  motivo: string;
  /** La fecha del inverso; la escribe el usuario, por omisión hoy. No puede ser anterior a la del original. */
  fecha?: string;
  /** El módulo de origen que pide la anulación por una orden: no recibe su propio aviso (CP4). */
  pedidoPor?: OrigenDeMovimiento;
}

/** Quién debe el dinero de un depósito en tránsito rechazado; las demás partidas de apertura lo dejan en `null`. */
interface ModoDeApertura {
  pagador: string | null;
}

const AUDITORIA = { recurso: 'bancos.movimientos', accion: 'anular' } as const;

/**
 * Anula una nota suelta: crea su movimiento inverso (crédito ↔ débito), enlazado al original, que
 * queda marcado «revertido». Nada se borra. Queda en la auditoría tal como estaba. También anula una partida de la carga
 * inicial (`anularPartidaDeApertura`): siempre con inverso, con la fecha posterior al corte y el concepto «Partidas de
 * apertura anuladas».
 */
export class AnularMovimiento {
  constructor(private readonly dependencias: DependenciasDeAnularMovimiento) {}

  /**
   * @throws MovimientoAnulado o MovimientoYaRevertido si ya no estaba vigente; MotivoDeAnulacionInvalido si falta el motivo.
   * @throws MovimientoDeTransferencia o MovimientoDeCheque si no es una nota suelta; NoEsUnaNota si es el saldo inicial.
   * @throws FechaDeReversionAnterior si la fecha del inverso es anterior a la del original.
   * @throws SaldoInsuficiente si el inverso deja la cuenta en negativo sin sobregiro permitido.
   * @throws ModuloDeOrigenInactivo o lo que rechace el módulo de origen si es de otro módulo o está marcado (CP4).
   */
  ejecutar(operador: Operador, solicitud: AnulacionDeMovimiento): Promise<MovimientoDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, solicitud));
  }

  /**
   * Anula un depósito o débito en tránsito o un error del banco de la carga inicial (§5.3). Corre dentro de la unidad de
   * trabajo de quien lo llama.
   * @throws NoSeAnulaElSaldoDelBanco, ElPosfechadoSeAnulaComoCheque, PartidaDeAperturaNoEncontrada, InversoDentroDeLaApertura
   *   y los de `ejecutar`.
   */
  anularPartidaDeApertura(
    operador: Operador,
    solicitud: AnulacionDeMovimiento & ModoDeApertura,
  ): Promise<MovimientoDto> {
    return this.anular(operador, solicitud, { pagador: solicitud.pagador });
  }

  private async anular(
    operador: Operador,
    solicitud: AnulacionDeMovimiento,
    apertura?: ModoDeApertura,
  ): Promise<MovimientoDto> {
    const { movimientoId, motivo, fecha, pedidoPor } = solicitud;
    const { repositorio, consultas, reglas, auditoria, correlativos } = this.dependencias;
    const movimiento = await movimientoExistente(repositorio, movimientoId);
    if (!apertura) movimiento.exigirClase(false);
    const anterior = await consultas.obtener(movimientoId);
    const fechaDelInverso = await this.fechaDelInverso(operador, anterior, { fecha, deLaApertura: !!apertura });
    await this.revisarElOrigen(operador, anterior, { motivo, fecha: fechaDelInverso, pedidoPor });
    const inverso = await this.revertir(operador, movimiento, { motivo, fecha: fechaDelInverso, apertura });
    const { cuentaBancariaId, motivoDeReversion } = movimiento.instantanea();
    await reglas.revisar(operador, {
      cuentaBancariaId,
      fechas: [fechaDelInverso],
      diferencia: inverso.efectoEnCentavos,
    });
    await numerarSiCorresponde(correlativos, inverso);
    await repositorio.guardar(movimiento);
    await repositorio.agregar(inverso);
    await auditoria.registrar({ ...AUDITORIA, registroId: movimientoId, anterior, motivo: motivoDeReversion });
    return consultas.obtener(movimientoId);
  }

  private async revertir(
    operador: Operador,
    movimiento: Movimiento,
    { motivo, fecha, apertura }: { motivo: string; fecha: string; apertura?: ModoDeApertura },
  ): Promise<Movimiento> {
    if (!apertura) return movimiento.revertir(fecha, motivo);
    const concepto = await this.dependencias.conceptos.deSistema(operador, CLAVE_DE_ANULACION_DE_APERTURA);
    return movimiento.revertirPartidaDeApertura(fecha, motivo, {
      conceptoId: concepto.id.valor,
      pagador: apertura.pagador,
    });
  }

  /** Si el movimiento es de otro módulo o está marcado, ese módulo revisa la anulación (con inverso) antes de hacerla. */
  private revisarElOrigen(
    operador: Operador,
    movimiento: MovimientoDto,
    { motivo, fecha, pedidoPor }: Pick<AnulacionDeMovimiento, 'motivo' | 'fecha' | 'pedidoPor'>,
  ): Promise<void> {
    return this.dependencias.revisor.revisar(operador, {
      movimiento,
      cambio: 'anular',
      formaDeAnulacion: 'con_inverso',
      motivo,
      fecha,
      pedidoPor,
    });
  }

  /**
   * Por omisión, la fecha del inverso es la que escribió el usuario (hoy si no escribió ninguna).
   * Con `bancos.anulaciones.misma_fecha` activa y el mes del original sin conciliar, se usa la
   * fecha del original en su lugar. La de una partida de la carga inicial siempre es posterior al corte.
   */
  private async fechaDelInverso(
    operador: Operador,
    original: MovimientoDto,
    { fecha, deLaApertura }: { fecha?: string; deLaApertura: boolean },
  ): Promise<string> {
    const { consultas, politicaDeMismaFecha, reloj, reglas } = this.dependencias;
    if (deLaApertura) {
      const elegida = fecha ?? (await reloj.hoy(operador));
      await reglas.revisarElInversoDeApertura(operador, elegida);
      return elegida;
    }
    const conciliadaHasta = await consultas.conciliadaHasta(original.cuentaBancariaId);
    const mesDelOriginalConciliado = conciliadaHasta !== null && original.fecha <= conciliadaHasta;
    if (!mesDelOriginalConciliado && (await politicaDeMismaFecha.aplica(operador))) return original.fecha;
    return fecha ?? (await reloj.hoy(operador));
  }
}
