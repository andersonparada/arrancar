import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { TipoDeActa } from '../../../dominio/tipos-de-baja.js';
import type { BajaDto } from '../../dto/baja.dto.js';
import type { AdjuntadorDeDocumentos, PedidoDeDocumentoDeBaja } from './adjuntar-documento-de-baja.js';

/** El acta de la baja y quién la firma (V-12). */
export interface PedidoDeActa extends PedidoDeDocumentoDeBaja {
  tipoDeActa: TipoDeActa;
}

/** Guarda o reemplaza el acta de una baja (administrativa o notarial). */
export class SubirActaDeBaja {
  constructor(private readonly adjuntador: AdjuntadorDeDocumentos) {}

  /**
   * @throws RecursoNoEncontrado si la baja no existe; BajaAnulada si está anulada.
   * @throws BajaInvalida si el tipo de acta no es válido.
   * @throws RevisionDePdfSaturada (429), o un error de PDF o de foto (400), si no se acepta el archivo.
   */
  ejecutar(operador: Operador, pedido: PedidoDeActa): Promise<BajaDto> {
    return this.adjuntador.adjuntar(operador, pedido, {
      documento: 'acta',
      actual: (baja) => {
        const acta = baja.instantanea().acta;
        return acta ? { archivoId: acta.archivoId, tipoDeActa: acta.tipo } : null;
      },
      poner: (baja, archivoId) => baja.ponerActa({ archivoId, tipo: pedido.tipoDeActa }),
    });
  }
}
