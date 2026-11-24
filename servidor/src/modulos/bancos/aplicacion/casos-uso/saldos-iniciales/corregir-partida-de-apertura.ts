import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { avisosDeLaPartida } from '../../../dominio/apertura.js';
import { esParteDeCheque } from '../../../dominio/partes-de-apertura.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import { normalizarLaPartida, type PartidaNormalizada } from '../../armador-de-partidas.js';
import type { PartidaGuardadaDto, SolicitudDePartida } from '../../dto/saldo-inicial.dto.js';
import {
  abrirEscritura,
  partidaPorCambiar,
  RECURSO_DE_PARTIDAS,
  type DependenciasDeSaldosIniciales,
  type PartidaPorCambiar,
} from './dependencias-de-saldos-iniciales.js';

/** Lo que cambia de una partida: lo mismo que al agregarla, menos la parte (que no se cambia). */
export type CorreccionDePartida = Omit<SolicitudDePartida, 'parte'> & { movimientoId: string };

/** Corrige una partida con la carga abierta y mientras no esté marcada en una conciliación. Audita `corregir`. */
export class CorregirPartidaDeApertura {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /**
   * @throws RecursoNoEncontrado, MovimientoDeOtroModulo (posfechado ligado), MovimientoMarcadoEnConciliacion, MesConciliado, SinFechaDeInicio, CargaInicialCerrada
   *   y los errores de revisión de la partida (como al agregarla).
   */
  ejecutar(operador: Operador, correccion: CorreccionDePartida): Promise<PartidaGuardadaDto> {
    const { unidadDeTrabajo, ficha } = this.dependencias;
    const { cuentaBancariaId, movimientoId } = correccion;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { corte } = await abrirEscritura(this.dependencias, operador, cuentaBancariaId);
      const anterior = await partidaPorCambiar(this.dependencias, operador, { cuentaBancariaId, movimientoId });
      const partida = normalizarLaPartida({ ...correccion, parte: anterior.base.parte });
      await this.corregir(operador, { partida, anterior, corte });
      const resumen = await ficha.deLaCuenta(operador, cuentaBancariaId);
      const guardada = resumen.partidas.find((candidata) => candidata.movimientoId === movimientoId)!;
      const { mesesDeVencimiento } = await ficha.contexto(operador);
      const avisos = avisosDeLaPartida(partida, { corte, mesesDeVencimiento });
      return { partida: guardada, avisos: [...avisos, ...(await ficha.avisosDeLaCuenta(operador, resumen))] };
    });
  }

  private async corregir(
    operador: Operador,
    { partida, anterior, corte }: { partida: PartidaNormalizada; anterior: PartidaPorCambiar; corte: string },
  ): Promise<void> {
    const { repositorioMovimientos, reglas, armador, auditoria } = this.dependencias;
    const { cuentaBancariaId, movimientoId } = anterior.base;
    const movimiento = await movimientoExistente(repositorioMovimientos, movimientoId);
    movimiento.exigirNoMarcadoEnConciliacion(anterior.base.conciliacionId, 'corregir');
    movimiento.exigirSinOrigen();
    await reglas.revisar(operador, { cuentaBancariaId, fechas: [anterior.base.fecha, partida.fecha], diferencia: 0 });
    const conceptoActual = movimiento.instantanea().conceptoId;
    movimiento.corregirPartida(await armador.datos(operador, partida, { corte, conceptoActual }));
    if (esParteDeCheque(partida.parte)) await this.cambiarElCheque(operador, partida, movimientoId);
    await repositorioMovimientos.guardar(movimiento);
    await auditoria.registrar({
      recurso: RECURSO_DE_PARTIDAS,
      registroId: movimientoId,
      accion: 'corregir',
      anterior: anterior.dto,
    });
  }

  private async cambiarElCheque(operador: Operador, partida: PartidaNormalizada, movimientoId: string) {
    const { chequesDeApertura } = this.dependencias;
    const { cuentaBancariaId, serie, numeroDeCheque } = partida;
    await chequesDeApertura.liberar(movimientoId);
    await chequesDeApertura.asignar(operador, { cuentaBancariaId, serie, numero: numeroDeCheque ?? 0 }, movimientoId);
  }
}
