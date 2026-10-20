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

export interface DatosDeBajaDeDocumento {
  documentoId: string;
  empresaId: string;
  destino: DestinoDeDocumento;
}

/** Un documento quedó anulado (sigue en el libro como rastro, sin su número). Se publica tras confirmar. */
export class DocumentoAnulado extends EventoDominio<DatosDeBajaDeDocumento> {
  readonly nombre = 'libro-de-compras.documento_anulado';

  constructor(datos: DatosDeBajaDeDocumento) {
    super(datos);
  }
}

/** Un documento se eliminó del libro. Se publica tras confirmar. */
export class DocumentoEliminado extends EventoDominio<DatosDeBajaDeDocumento> {
  readonly nombre = 'libro-de-compras.documento_eliminado';

  constructor(datos: DatosDeBajaDeDocumento) {
    super(datos);
  }
}

export interface DatosDeCambioDePeriodo {
  empresaId: string;
  /** Primer día del mes. */
  periodo: string;
}

export type DatosDeDeclaracion = DatosDeCambioDePeriodo & { rectificacion: boolean };

/** Un período se declaró o se rectificó (lo escuchará Contabilidad, cuando exista). Se publica tras confirmar. */
export class PeriodoDeclaradoEnElLibro extends EventoDominio<DatosDeDeclaracion> {
  readonly nombre = 'libro-de-compras.periodo_declarado';

  constructor(datos: DatosDeDeclaracion) {
    super(datos);
  }
}

/** Un período declarado se reabrió. Se publica tras confirmar. */
export class PeriodoReabierto extends EventoDominio<DatosDeCambioDePeriodo> {
  readonly nombre = 'libro-de-compras.periodo_reabierto';

  constructor(datos: DatosDeCambioDePeriodo) {
    super(datos);
  }
}
