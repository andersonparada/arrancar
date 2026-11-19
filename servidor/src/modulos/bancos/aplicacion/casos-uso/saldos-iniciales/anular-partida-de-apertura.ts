import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { exigirPartidaQueSeAnula, pagadorDeLaAnulacion } from '../../../dominio/anulacion-de-apertura.js';
import { eventoDeAperturaAnulada } from '../../evento-de-apertura-anulada.js';
import type { PartidaAnuladaDto } from '../../dto/saldo-inicial.dto.js';
import type { AnularCheque } from '../cheques/anular-cheque.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import type { AnularMovimiento } from '../movimientos/anular-movimiento.js';
import { partidaDeLaCuenta, type DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

/** Lo que se pide para anular una partida de la carga inicial. */
export interface AnulacionDePartida {
  cuentaBancariaId: string;
  movimientoId: string;
  motivo: string;
  /** La fecha del inverso: posterior al corte; por omisión, hoy. */
  fecha?: string;
  /** Quién debe ese dinero; obligatorio solo en el depósito en tránsito. */
  pagador?: string | null;
}

/** Los casos de uso que hacen la anulación y el publicador de lo que ocurrió. */
export interface AnuladoresDeApertura {
  anularCheque: AnularCheque;
  anularMovimiento: AnularMovimiento;
  publicadorEventos: PublicadorEventos;
}

/**
 * Anula una partida de la carga inicial con su inverso (diseño §5.3), con la carga abierta o cerrada: es un hecho del
 * período. Delega en `AnularCheque` (cheque en circulación) o `AnularMovimiento` (depósito o débito en tránsito y error
 * del banco). El saldo del banco no se anula y el posfechado se anula como cualquier cheque, en Cheques. Al confirmar
 * publica `bancos.partida_de_apertura_anulada`.
 */
export class AnularPartidaDeApertura {
  constructor(
    private readonly dependencias: DependenciasDeSaldosIniciales,
    private readonly anuladores: AnuladoresDeApertura,
  ) {}

  /**
   * @throws RecursoNoEncontrado si la partida no es de esa cuenta; NoSeAnulaElSaldoDelBanco, ElPosfechadoSeAnulaComoCheque,
   *   PartidaDeAperturaNoEncontrada, PagadorObligatorio (depósito sin pagador), InversoDentroDeLaApertura (fecha del inverso
   *   hasta el corte), MovimientoMarcadoEnConciliacion, MovimientoYaRevertido o los de anular un cheque o una nota.
   */
  async ejecutar(operador: Operador, solicitud: AnulacionDePartida): Promise<PartidaAnuladaDto> {
    const { unidadDeTrabajo } = this.dependencias;
    const { anulada, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, solicitud));
    await this.anuladores.publicadorEventos.publicar(eventos);
    return anulada;
  }

  private async anular(operador: Operador, solicitud: AnulacionDePartida) {
    const { cuentaBancariaId, movimientoId } = solicitud;
    const { consultas, repositorioMovimientos } = this.dependencias;
    await partidaDeLaCuenta(this.dependencias, operador, { cuentaBancariaId, movimientoId });
    const movimiento = await movimientoExistente(repositorioMovimientos, movimientoId);
    const parte = exigirPartidaQueSeAnula(movimiento.parteDeApertura);
    const base = (await consultas.partidas(cuentaBancariaId)).find((p) => p.movimientoId === movimientoId);
    movimiento.exigirNoMarcadoEnConciliacion(base?.conciliacionId ?? null);
    const pagador = pagadorDeLaAnulacion(parte, solicitud.pagador);
    const eventos =
      parte === 'cheque_en_circulacion'
        ? await this.anularElCheque(operador, solicitud)
        : await this.anularLaNota(operador, solicitud, pagador);
    const partida = await partidaDeLaCuenta(this.dependencias, operador, { cuentaBancariaId, movimientoId });
    const inverso = await repositorioMovimientos.buscarInversoDe(Identificador.desde(movimientoId));
    return { anulada: { partida, inversoId: inverso!.id.valor }, eventos };
  }

  private async anularElCheque(operador: Operador, solicitud: AnulacionDePartida): Promise<EventoDominio[]> {
    const { chequesDeApertura } = this.dependencias;
    const cheque = await chequesDeApertura.chequeDe(solicitud.movimientoId);
    const { motivo, fecha } = solicitud;
    const anulado = await this.anuladores.anularCheque.anularSinPublicar(operador, {
      chequeId: cheque!.chequeId,
      motivo,
      fecha,
    });
    return anulado.eventos;
  }

  private async anularLaNota(
    operador: Operador,
    { movimientoId, motivo, fecha }: AnulacionDePartida,
    pagador: string | null,
  ): Promise<EventoDominio[]> {
    const { repositorioMovimientos } = this.dependencias;
    await this.anuladores.anularMovimiento.anularPartidaDeApertura(operador, { movimientoId, motivo, fecha, pagador });
    const original = await movimientoExistente(repositorioMovimientos, movimientoId);
    const inverso = await repositorioMovimientos.buscarInversoDe(original.id);
    return [eventoDeAperturaAnulada(original, inverso!, { numeroDeCheque: null, pagador })];
  }
}
