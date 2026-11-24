import type { MovimientoDelKardex } from '../../dominio/costeo/movimientos-del-kardex.js';
import type { RenglonDePlan } from '../../dominio/plan-de-documento.js';
import { planDeEntradaDeTraslado } from '../../dominio/traslado.js';
import type { ArticuloParaMovimiento } from '../puertos/catalogos-del-kardex.js';
import type { DocumentoGuardado } from '../puertos/repositorio-de-documentos.js';
import type { DependenciasDelKardex } from './dependencias-del-kardex.js';
import { RegistradorDeDocumento, type ResultadoDeRegistro } from './registrador-de-documento.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

export interface PedidoDeRecepcion {
  salida: DocumentoGuardado;
  /** Los movimientos de la salida: lo que viajó. */
  movimientosDeLaSalida: readonly MovimientoDelKardex[];
  fecha: string;
  observaciones: string | null;
}

/** La recepción y la salida ya con su estado final (`recibido`), para los eventos y la respuesta. */
export interface ResultadoDeRecepcion {
  entrada: ResultadoDeRegistro;
  salida: DocumentoGuardado;
  articulos: ReadonlyMap<string, ArticuloParaMovimiento>;
}

const magnitud = (cantidad: bigint): bigint => (cantidad < 0n ? -cantidad : cantidad);

/**
 * Registra la entrada de un traslado en la bodega de destino (§6.7) y pasa la salida a `recibido`. La usan el traslado
 * sin tránsito (la entrada nace junto con la salida) y la recepción de uno en tránsito. Corre dentro de la unidad de
 * trabajo del caso de uso.
 */
export class RecepcionDeTraslado {
  private readonly registrador: RegistradorDeDocumento;

  constructor(private readonly dependencias: DependenciasDelKardex) {
    this.registrador = new RegistradorDeDocumento(dependencias);
  }

  /**
   * @throws DocumentoInvalido si la fecha es anterior a la de la salida.
   * @throws RecursoNoEncontrado, ElementoInactivo, MesCerrado, FechaAnteriorAlInicio, ExistenciaNegativa del registro.
   */
  async registrar(operador: Operador, pedido: PedidoDeRecepcion): Promise<ResultadoDeRecepcion> {
    const { catalogos, documentos } = this.dependencias;
    const { salida, movimientosDeLaSalida } = pedido;
    const ids = [...new Set(movimientosDeLaSalida.map((m) => m.articuloId))];
    const articulos = new Map((await catalogos.articulos(ids)).map((articulo) => [articulo.id, articulo]));
    const plan = planDeEntradaDeTraslado({
      fechaDeLaSalida: salida.fecha,
      fecha: pedido.fecha,
      bodegaDeDestinoId: salida.bodegaDeDestinoId!,
      documentoDeLaSalidaId: salida.id,
      observaciones: pedido.observaciones,
      renglones: movimientosDeLaSalida.map((m) => this.renglonDe(m, articulos)),
    });
    const entrada = await this.registrador.registrar(operador, { plan, articulos });
    const cambio = { estadoDeTraslado: 'recibido', documentoRelacionadoId: entrada.documento.id } as const;
    await documentos.cambiarTraslado(salida.id, cambio);
    return { entrada, salida: { ...salida, ...cambio }, articulos };
  }

  /** Lo mismo que salió, en la unidad base del artículo, ligado al movimiento de la salida que lo origina. */
  private renglonDe(m: MovimientoDelKardex, articulos: ReadonlyMap<string, ArticuloParaMovimiento>): RenglonDePlan {
    return {
      articuloId: m.articuloId,
      loteId: m.loteId,
      cantidad: magnitud(m.cantidad),
      cantidadEscrita: magnitud(m.cantidad),
      unidadEscritaId: articulos.get(m.articuloId)?.unidadBaseId ?? null,
      costoTotal: 0n,
      movimientoDeOrigenId: m.id,
    };
  }
}
