import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type {
  DestinoDeDocumentoDeVenta,
  LineaDeVentaRegistrada,
  TipoDeDocumentoDeVenta,
} from '../../core/contratos/libro-de-ventas.contratos.js';

export interface DatosDelDocumentoRegistrado {
  documentoId: string;
  empresaId: string;
  tipo: TipoDeDocumentoDeVenta;
  clienteId: string | null;
  periodo: string;
  fechaEmision: string;
  totalCentavos: number;
  moneda: string;
  destino: DestinoDeDocumentoDeVenta | null;
  lineas: LineaDeVentaRegistrada[];
}

/** Un documento quedó registrado en el libro de ventas (lo escucha Contabilidad, cuando exista). Se publica tras confirmar. */
export class DocumentoDeVentaRegistrado extends EventoDominio<DatosDelDocumentoRegistrado> {
  readonly nombre = 'libro-de-ventas.documento_registrado';

  constructor(datos: DatosDelDocumentoRegistrado) {
    super(datos);
  }
}

export interface DatosDeAnulacion {
  documentoId: string;
  empresaId: string;
  destino: DestinoDeDocumentoDeVenta | null;
  fechaDeAnulacion: string;
}

/** Un documento quedó anulado (sigue en el libro como rastro, con montos en cero). Se publica tras confirmar. */
export class DocumentoDeVentaAnulado extends EventoDominio<DatosDeAnulacion> {
  readonly nombre = 'libro-de-ventas.documento_anulado';

  constructor(datos: DatosDeAnulacion) {
    super(datos);
  }
}

export interface DatosDeEliminacion {
  documentoId: string;
  empresaId: string;
  destino: DestinoDeDocumentoDeVenta | null;
}

/** Un documento se eliminó del libro. Se publica tras confirmar. */
export class DocumentoDeVentaEliminado extends EventoDominio<DatosDeEliminacion> {
  readonly nombre = 'libro-de-ventas.documento_eliminado';

  constructor(datos: DatosDeEliminacion) {
    super(datos);
  }
}
