import { verificarCantidadesPorClave } from '../../dominio/costeo/cantidades-por-clave.js';
import {
  capasDelRecorrido,
  cambiosDelRecorrido,
  saldoDelRecorrido,
} from '../../dominio/costeo/cambios-del-recorrido.js';
import {
  diferenciasDeRepartos,
  diferenciasDeSalidas,
  type DiferenciaDeRepartoGuardado,
  type DiferenciaDeSalida,
} from '../../dominio/costeo/diferencias-de-salidas.js';
import { ExistenciaNegativa } from '../../dominio/costeo/errores.js';
import {
  aMovimientoDeCantidad,
  aMovimientosDeCosto,
  type MovimientoDelKardex,
} from '../../dominio/costeo/movimientos-del-kardex.js';
import { recalcularPeps } from '../../dominio/costeo/peps.js';
import { recalcularPromedio } from '../../dominio/costeo/promedio.js';
import type { CausaDeRecalculo } from '../../dominio/costeo/recalculo.js';
import type { Capa, MetodoDeCosteo, ResultadoDeMovimiento } from '../../dominio/costeo/tipos.js';
import type { AlmacenDelKardex } from '../puertos/almacen-del-kardex.js';

export type { DiferenciaDeRepartoGuardado, DiferenciaDeSalida };

export interface PedidoDeRecalculo {
  articuloId: string;
  metodo: MetodoDeCosteo;
  causa: CausaDeRecalculo;
  /** El documento que lo causa: un registro con fecha anterior o una anulación. */
  documentoCausaId: string;
  /** Los movimientos que este documento acaba de agregar: su costo se calcula por primera vez. */
  movimientosNuevos: ReadonlySet<string>;
}

/** Lo que el recálculo cambió de lo ya registrado: el costo de salidas y lo absorbido de los repartos. */
export interface CambiosDelRecalculo {
  diferencias: DiferenciaDeSalida[];
  repartos: DiferenciaDeRepartoGuardado[];
}

interface Calculado {
  resultados: readonly ResultadoDeMovimiento[];
  /** Solo con PEPS: lo que queda de cada entrada. */
  capas: readonly Capa[] | null;
}

/**
 * Vuelve a recorrer el kardex de un artículo (§7.3) con el método de la empresa: calcula el costo de las salidas, lo
 * absorbido de los repartos (rebajas) y los saldos de todos los movimientos vigentes y guarda **solo** lo que cambió,
 * junto con las capas de PEPS y el saldo del artículo. Falla con `existencia_negativa` si en algún punto, en la empresa
 * o en la bodega y el lote, no alcanza.
 *
 * Recorre todo el historial del artículo (no solo desde la posición nueva): así las capas PEPS de cualquier fecha salen
 * del mismo recorrido, sin reconstruirlas aparte, y cada reparto parte del factor 1 de su entrada. Un mes cerrado no
 * cambia porque sus movimientos ya traen el costo que les tocó y el recorrido da el mismo resultado. En memoria son
 * enteros; en la base solo se escribe lo que cambia.
 */
export class RecalculadorDeArticulo {
  constructor(private readonly almacen: AlmacenDelKardex) {}

  async recalcular(pedido: PedidoDeRecalculo): Promise<CambiosDelRecalculo> {
    const { articuloId, metodo } = pedido;
    const guardados = await this.almacen.movimientosVigentes(articuloId);
    const { resultados, capas } = this.calcular({ guardados, metodo, articuloId });
    await this.almacen.actualizarMovimientos(cambiosDelRecorrido(guardados, resultados));
    if (capas) await this.almacen.reemplazarCapas(articuloId, capasDelRecorrido(guardados, resultados, capas));
    await this.almacen.guardarSaldo(articuloId, saldoDelRecorrido(resultados));
    const diferencias = diferenciasDeSalidas(guardados, resultados, pedido.movimientosNuevos);
    const repartos = diferenciasDeRepartos(guardados, resultados, pedido.movimientosNuevos);
    if (diferencias.length > 0 || repartos.length > 0) await this.guardarRastro(pedido, { diferencias, repartos });
    return { diferencias, repartos };
  }

  private calcular(datos: {
    guardados: readonly MovimientoDelKardex[];
    metodo: MetodoDeCosteo;
    articuloId: string;
  }): Calculado {
    const { guardados, metodo, articuloId } = datos;
    try {
      verificarCantidadesPorClave(guardados.map(aMovimientoDeCantidad));
      const entrada = aMovimientosDeCosto(guardados);
      if (metodo === 'peps') {
        const { resultados, estado } = recalcularPeps(entrada);
        return { resultados, capas: estado };
      }
      return { resultados: recalcularPromedio(entrada).resultados, capas: null };
    } catch (error) {
      throw error instanceof ExistenciaNegativa ? error.paraElArticulo(articuloId) : error;
    }
  }

  private async guardarRastro(pedido: PedidoDeRecalculo, cambios: CambiosDelRecalculo): Promise<void> {
    const { diferencias, repartos } = cambios;
    const desdeFecha = [...diferencias, ...repartos].map((d) => d.fecha).sort()[0]!;
    const suma = diferencias.reduce((total, d) => total + BigInt(d.diferenciaCentavos), 0n);
    const aResultados = repartos.reduce((total, d) => total + BigInt(d.diferenciaAResultadosCentavos), 0n);
    await this.almacen.agregarRecalculo({
      articuloId: pedido.articuloId,
      desdeFecha,
      documentoCausaId: pedido.documentoCausaId,
      causa: pedido.causa,
      salidasAfectadas: diferencias.length,
      diferenciaDeCosto: suma,
      repartosAfectados: repartos.length,
      diferenciaAResultados: aResultados,
    });
  }
}
