import type { CausaDeAnulacion } from '../../dominio/baja-de-documento.js';
import type { DocumentoDeCompra } from '../../dominio/documento-de-compra.js';
import type {
  FiltroDeDocumentos,
  PaginaDeDocumentosDto,
  PaginacionDeDocumentos,
} from '../dto/documento-listado.dto.js';

/** Una nota de crédito que rebaja una factura; el total, en centavos. */
export interface NotaDeFactura {
  id: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: number;
  estado: 'vigente' | 'anulado';
}

/** Un documento ya guardado: lo registrado más su estado, lo que dijo el destino y las notas que lo rebajan. */
export interface DocumentoGuardado {
  documento: DocumentoDeCompra;
  estado: 'vigente' | 'anulado';
  anuladoEn: Date | null;
  anuladoPor: string | null;
  motivoDeAnulacion: string | null;
  causaDeAnulacion: CausaDeAnulacion | null;
  procesadoEnDestinoEn: Date | null;
  notas: NotaDeFactura[];
}

export interface AnulacionDeDocumento {
  anuladoPor: string;
  motivo: string;
  causa: CausaDeAnulacion;
}

/** Lee y cambia el estado de documentos ya guardados; RLS limita todo a la empresa de la transacción. */
export interface RepositorioDeDocumentosGuardados {
  /** Con `bloquear`, la fila queda bloqueada hasta el fin de la transacción (anular, eliminar, procesar). */
  buscar(id: string, bloquear: boolean): Promise<DocumentoGuardado | null>;
  /** Pasa a `anulado` con su fecha, usuario, causa y motivo; sus únicos quedan libres (índices parciales). */
  anular(id: string, anulacion: AnulacionDeDocumento): Promise<void>;
  /** Borra el documento; sus líneas y retenciones se van en cascada. */
  eliminar(id: string): Promise<void>;
  /** Fija `procesado_en_destino_en` al momento actual o lo limpia. */
  marcarProcesado(id: string, procesado: boolean): Promise<void>;
}

/** La lista de documentos de la empresa, del período más reciente al más antiguo. */
export interface ConsultasDeListaDeDocumentos {
  listar(filtro: FiltroDeDocumentos, paginacion: PaginacionDeDocumentos): Promise<PaginaDeDocumentosDto>;
}
