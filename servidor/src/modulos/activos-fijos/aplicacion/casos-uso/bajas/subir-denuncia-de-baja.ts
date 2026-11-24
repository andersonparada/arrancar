import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BajaDto } from '../../dto/baja.dto.js';
import type { AdjuntadorDeDocumentos, PedidoDeDocumentoDeBaja } from './adjuntar-documento-de-baja.js';

/** Guarda o reemplaza la denuncia (MP o PNC) de una baja por robo o extravío. */
export class SubirDenunciaDeBaja {
  constructor(private readonly adjuntador: AdjuntadorDeDocumentos) {}

  /**
   * @throws RecursoNoEncontrado si la baja no existe; BajaAnulada si está anulada.
   * @throws RevisionDePdfSaturada (429), o un error de PDF o de foto (400), si no se acepta el archivo.
   */
  ejecutar(operador: Operador, pedido: PedidoDeDocumentoDeBaja): Promise<BajaDto> {
    return this.adjuntador.adjuntar(operador, pedido, {
      documento: 'denuncia',
      actual: (baja) => {
        const archivoId = baja.instantanea().denunciaArchivoId;
        return archivoId ? { archivoId, tipoDeActa: null } : null;
      },
      poner: (baja, archivoId) => baja.ponerDenuncia(archivoId),
    });
  }
}
