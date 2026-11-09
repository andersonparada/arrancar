import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { OrigenDeDocumento, TipoDeDocumento } from './tipos-de-documento.js';

export interface DatosDeDocumentoAnulado {
  empresaId: string;
  /** El id del documento en Cuentas por pagar. */
  documentoId: string;
  /** El id del documento en Libro de compras; nulo en un saldo inicial (que no se anula). */
  documentoDeCompraId: string | null;
  origen: OrigenDeDocumento;
  estabaAutorizado: boolean;
}

export interface DatosDeDocumentoAutorizado {
  empresaId: string;
  /** El id del documento en Cuentas por pagar. */
  documentoId: string;
  /** El id del documento en Libro de compras; nulo en un saldo inicial. */
  documentoDeCompraId: string | null;
  origen: OrigenDeDocumento;
  tipo: TipoDeDocumento;
  proveedorId: string;
  totalCentavos: number;
  retencionesCentavos: number;
  autorizacionPropia: boolean;
}

/** Un documento por pagar quedó aprobado para pago (U12: no es una provisión). Se publica tras confirmar la transacción. */
export class DocumentoAutorizadoEvento extends EventoDominio<DatosDeDocumentoAutorizado> {
  readonly nombre = 'cuentas-por-pagar.documento_autorizado';

  constructor(datos: DatosDeDocumentoAutorizado) {
    super(datos);
  }
}

export interface DatosDeDocumentoDesautorizado {
  empresaId: string;
  documentoId: string;
  documentoDeCompraId: string | null;
  origen: OrigenDeDocumento;
}

/** Un documento autorizado volvió a completado. Se publica tras confirmar la transacción. */
export class DocumentoDesautorizado extends EventoDominio<DatosDeDocumentoDesautorizado> {
  readonly nombre = 'cuentas-por-pagar.documento_desautorizado';

  constructor(datos: DatosDeDocumentoDesautorizado) {
    super(datos);
  }
}

/** Un documento por pagar quedó anulado (sigue como rastro). Se publica tras confirmar la transacción de quien lo anuló. */
export class DocumentoAnulado extends EventoDominio<DatosDeDocumentoAnulado> {
  readonly nombre = 'cuentas-por-pagar.documento_anulado';

  constructor(datos: DatosDeDocumentoAnulado) {
    super(datos);
  }
}
