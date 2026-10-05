import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { DocumentoParaDestino } from '../../core/contratos/libro-de-compras.contratos.js';
import type { DestinoDeDocumento } from './destinos-de-documento.js';

export type DatosDelDocumentoRegistrado = DocumentoParaDestino & { empresaId: string; destino: DestinoDeDocumento };

/** Un documento quedó registrado en el libro (lo escucha Contabilidad, cuando exista). Se publica tras confirmar. */
export class DocumentoRegistrado extends EventoDominio<DatosDelDocumentoRegistrado> {
  readonly nombre = 'libro-de-compras.documento_registrado';

  constructor(datos: DatosDelDocumentoRegistrado) {
    super(datos);
  }
}
