import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import { creoSuMovimiento, type PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { revisarReglasDePago, type ReglaDePago } from '../../../dominio/reglas-de-anulacion-de-pagos.js';
import { dtoDeLaFicha } from '../../dto/dto-de-ficha-de-pago.js';
import type { FichaDePagoDto } from '../../dto/ficha-de-pago.dto.js';
import type { ExtrasDeLosPagos } from '../../puertos/puertos-de-lista-de-pagos.js';
import type { RetencionesDelLibro } from '../../puertos/puertos-de-pagos.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';
import { LectorDelPago } from './lector-del-pago.js';

/** Lo que necesita armar la ficha de un pago: lo de leerlo, lo que Bancos y el libro dicen de él y las reglas de anular. */
export interface DependenciasDeLaFicha extends Pick<
  DependenciasDeCambiarPagos,
  | 'pagos'
  | 'consultas'
  | 'consultasDePagos'
  | 'movimientos'
  | 'ajustes'
  | 'reloj'
  | 'topeDeDiferencia'
  | 'reglasParaAnular'
  | 'reglasParaReaplicar'
> {
  unidadDeTrabajo: UnidadDeTrabajo;
  retenciones: RetencionesDelLibro;
  extras: ExtrasDeLosPagos;
}

/** Una regla que se infringe dice que no se puede; cualquier otro error es un fallo de verdad. */
async function cumple(reglas: readonly ReglaDePago[], revision: Parameters<ReglaDePago>[0]): Promise<boolean> {
  try {
    await revisarReglasDePago(reglas, revision);
    return true;
  } catch (error) {
    if (error instanceof ErrorEsperado) return false;
    throw error;
  }
}

/**
 * Arma la ficha de un pago, vigente o anulado: el `PagoDto` con el cheque o la nota de Bancos (y si está conciliado), las
 * retenciones del libro con su constancia, lo que le queda a cada documento y qué se puede hacer con el pago: anular y
 * reaplicar según las mismas reglas que aplican esos casos de uso, y saldar la diferencia si algún residuo cabe en el tope.
 */
export class ArmadorDeLaFichaDelPago {
  private readonly lector: LectorDelPago;

  constructor(private readonly dependencias: DependenciasDeLaFicha) {
    this.lector = new LectorDelPago(dependencias);
  }

  /** @throws RecursoNoEncontrado si el pago no existe o es de otra empresa. */
  async armarDe(operador: Operador, pagoId: string): Promise<FichaDePagoDto> {
    const { pagos, retenciones, extras, topeDeDiferencia, movimientos, reloj } = this.dependencias;
    const pago = await pagos.buscar(pagoId);
    const complemento = await extras.extrasDe(pagoId);
    if (!pago || !complemento) throw new RecursoNoEncontrado('El pago');
    const { lineas, dto } = await this.lector.leer(operador, pago);
    const ficha = pago.movimientoId ? await movimientos.fichaDe(pago.movimientoId) : null;
    return dtoDeLaFicha({
      base: dto,
      lineas,
      movimiento: ficha && { ...ficha, id: pago.movimientoId! },
      extras: complemento,
      hoy: await reloj.hoy(operador),
      retenciones: await retenciones.deCargos(pago.lineas.map(({ cargoId }) => cargoId)),
      topeDeDiferenciaCentavos: await topeDeDiferencia.centavos(operador),
      ...(await this.loQueSePuede(pago, ficha?.conciliado ?? false)),
    });
  }

  private async loQueSePuede(pago: PagoConLineas, conciliado: boolean) {
    if (pago.estado !== 'vigente') return { puedeAnular: false, puedeReaplicar: false };
    const { reglasParaAnular, reglasParaReaplicar } = this.dependencias;
    const revision = { pago, conciliado: creoSuMovimiento(pago) && conciliado };
    return {
      puedeAnular: await cumple(reglasParaAnular, revision),
      puedeReaplicar: await cumple(reglasParaReaplicar, revision),
    };
  }
}
