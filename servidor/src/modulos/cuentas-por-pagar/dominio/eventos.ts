import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';

export interface DatosDeDocumentoAnulado {
  empresaId: string;
  /** El id del documento en Cuentas por pagar. */
  documentoId: string;
  /** El id del documento en Libro de compras. */
  documentoDeCompraId: string;
  estabaAutorizado: boolean;
}

/** Un documento por pagar quedó anulado (sigue como rastro). Se publica tras confirmar la transacción de quien lo anuló. */
export class DocumentoAnulado extends EventoDominio<DatosDeDocumentoAnulado> {
  readonly nombre = 'cuentas-por-pagar.documento_anulado';

  constructor(datos: DatosDeDocumentoAnulado) {
    super(datos);
  }
}
