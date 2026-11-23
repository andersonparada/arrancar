import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CausaDeRecalculo } from '../../../dominio/costeo/recalculo.js';
import { diaAnterior } from '../../../dominio/fechas.js';
import { planDeSaldoInicial } from '../../../dominio/saldo-inicial.js';
import type { SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import { RegistradorDeDocumento, type ResultadoDeRegistro } from '../../kardex/registrador-de-documento.js';
import { ResolutorDeRenglones } from '../../kardex/resolutor-de-renglones.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import { ResolutorDeLoteDeSaldo } from './resolutor-de-lote-de-saldo.js';

export interface PedidoDeSaldo {
  solicitud: SolicitudDeSaldoInicial;
  /** La fecha de inicio de la empresa: el saldo va al día anterior. */
  fechaDeInicio: string;
  causa: CausaDeRecalculo;
}

/**
 * Anota un renglón de saldo inicial en el documento `saldo_inicial` de su bodega (uno por bodega, vigente): si ya existe
 * lo agranda y si no, lo crea con la fecha del día anterior al inicio. Corre **dentro** de la unidad de trabajo de quien
 * lo llama y toma los candados del artículo antes de leer nada.
 */
export class RegistradorDeSaldos {
  private readonly registrador: RegistradorDeDocumento;
  private readonly resolutor: ResolutorDeRenglones;
  private readonly lotes: ResolutorDeLoteDeSaldo;

  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {
    this.registrador = new RegistradorDeDocumento(dependencias);
    this.resolutor = new ResolutorDeRenglones(dependencias.catalogos);
    this.lotes = new ResolutorDeLoteDeSaldo(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado si la bodega, el artículo o la unidad no existen o no se ven.
   * @throws DocumentoInvalido, LoteObligatorio, LoteInvalido, UnidadSinConversion, ElementoInactivo, ExistenciaNegativa.
   */
  async registrar(operador: Operador, pedido: PedidoDeSaldo): Promise<ResultadoDeRegistro> {
    const { solicitud, fechaDeInicio, causa } = pedido;
    const { almacen, documentos } = this.dependencias;
    await almacen.bloquear([solicitud.articuloId]);
    const loteId = await this.lotes.resolver(operador, solicitud);
    const resueltos = await this.resolutor.resolver([
      {
        articuloId: solicitud.articuloId,
        loteId,
        cantidad: solicitud.cantidad,
        unidadId: solicitud.unidadId,
        costoTotal: solicitud.costoTotal,
      },
    ]);
    const plan = planDeSaldoInicial({
      fecha: diaAnterior(fechaDeInicio),
      bodegaId: solicitud.bodegaId,
      observaciones: null,
      renglones: resueltos.renglones.map((renglon) => ({ ...renglon, fechaDeCapa: solicitud.fechaDeCapa })),
    });
    const documento = await documentos.buscarSaldoInicialDeBodega(solicitud.bodegaId);
    return this.registrador.registrar(operador, { plan, articulos: resueltos.articulos, documento, causa });
  }
}
