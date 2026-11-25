import { aCentavos } from '../../../../../core/compartido/dominio/centavos.js';
import type { Operador } from '../../../../../core/compartido/aplicacion/operador.js';
import type { Comprobante } from '../../../../dominio/comprobantes.js';
import { aSalida, type DestinoDeLaSalida, type SalidaPedida } from '../../../../dominio/documento-anulado.js';
import { DocumentoAnuladoResuelto } from '../../../../dominio/eventos-de-comprobantes.js';
import type { ComprobanteDto } from '../../../dto/comprobantes.dto.js';
import type { DependenciasDeComprobantes } from '../dependencias-de-comprobantes.js';
import { ApoyoDelDocumentoAnulado, type PeticionConMotivo } from './apoyo-del-documento-anulado.js';

export interface PeticionDeSalida extends PeticionConMotivo {
  salida: SalidaPedida['salida'];
  /** Lo que se recupera, con dos decimales; solo en la devolución y el cobro. */
  monto?: string | null;
  destino?: DestinoDeLaSalida | null;
}

/**
 * Resuelve el documento anulado por su emisor con una salida que no es reemplazo (`comprobantes.resolver`): devolución
 * (el proveedor regresa el dinero), cobro (se le cobra al proveedor o al custodio) o sin recuperación (el gasto queda no
 * deducible). Funciona igual en un vale liquidado, una reposición o un fondo cerrado: no toca el efectivo, el vale ni la
 * reposición; solo deja la salida en el comprobante y avisa a Contabilidad con `documento_anulado_resuelto`. Audita
 * `ajustar` con el comprobante como estaba y el motivo.
 */
export class ResolverDocumentoAnulado {
  private readonly apoyo: ApoyoDelDocumentoAnulado;

  constructor(private readonly dependencias: DependenciasDeComprobantes) {
    this.apoyo = new ApoyoDelDocumentoAnulado(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, ComprobanteSinDocumentoAnulado, SituacionDelDocumentoNoPermite, SalidaDelDocumentoInvalida,
   * MontoDeLaSalidaExcedido
   */
  async ejecutar(operador: Operador, pedido: PeticionDeSalida): Promise<ComprobanteDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.resolver(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async resolver(operador: Operador, pedido: PeticionDeSalida) {
    const comprobante = await this.apoyo.bloquear(pedido.comprobanteId);
    const seguimiento = aSalida(comprobante, {
      salida: pedido.salida,
      motivo: pedido.motivo,
      montoCentavos: pedido.monto ? aCentavos(pedido.monto) : null,
      destino: pedido.destino,
    });
    const motivo = `Documento anulado resuelto (${pedido.salida}): ${pedido.motivo}`;
    const dto = await this.apoyo.guardar({ anterior: comprobante, seguimiento, accion: 'ajustar', motivo });
    return { dto, evento: await this.evento(operador, { comprobante, seguimiento }) };
  }

  private async evento(
    operador: Operador,
    por: { comprobante: Comprobante; seguimiento: NonNullable<Comprobante['seguimiento']> },
  ) {
    const { comprobante, seguimiento } = por;
    return new DocumentoAnuladoResuelto({
      empresaId: operador.empresaId,
      fondoId: comprobante.fondoId!,
      comprobanteId: comprobante.id,
      documentoDeCompraId: comprobante.documentoDeCompraId!,
      documentoAnuladoId: null,
      salida: seguimiento.salida!,
      montoCentavos: comprobante.montoCentavos,
      salidaCentavos: seguimiento.montoCentavos,
      destino: seguimiento.destino,
      fecha: await this.dependencias.reloj.hoy(operador),
    });
  }
}
