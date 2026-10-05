import type { DestinoDeDocumento } from '../../dominio/destinos-de-documento.js';
import type { TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** Los filtros de la lista de documentos; todos opcionales. */
export interface FiltroDeDocumentos {
  /** Cualquier fecha del mes del libro (`AAAA-MM-DD`): se filtra por ese mes. */
  periodo?: string;
  proveedorId?: string;
  /** `vigente` oculta los anulados, `anulado` solo los anulados y `todos` no filtra; sin dato, no filtra. */
  estado?: 'vigente' | 'anulado' | 'todos';
  destino?: DestinoDeDocumento;
  tipo?: TipoDeDocumento;
}

/** Qué página de la lista se pide: de 1 en adelante, con hasta `limite` documentos. */
export interface PaginacionDeDocumentos {
  pagina: number;
  limite: number;
}

/** Una fila de la lista; el dinero, como texto con dos decimales. */
export interface DocumentoListadoDto {
  id: string;
  tipo: TipoDeDocumento;
  proveedorId: string;
  nombreEmisor: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  fechaRecepcion: string;
  periodo: string;
  destino: DestinoDeDocumento;
  estado: 'vigente' | 'anulado';
  muestraEnReportesSat: boolean;
  documentoAfectadoId: string | null;
  total: string;
  /** Lo retenido al proveedor (la suma de las retenciones). */
  retenido: string;
  netoAPagar: string;
  /** El destino ya lo procesó. */
  procesado: boolean;
  puedeAnular: boolean;
  puedeEliminar: boolean;
}

export interface PaginaDeDocumentosDto {
  elementos: DocumentoListadoDto[];
  /** Cuántos documentos cumplen el filtro, sin contar la paginación. */
  total: number;
  pagina: number;
  limite: number;
}
