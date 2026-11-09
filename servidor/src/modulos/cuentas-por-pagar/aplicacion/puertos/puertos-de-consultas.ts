import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import type { ProveedorConDocumentosDto } from '../dto/documento-por-pagar.dto.js';
import type { EstadoDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** Los filtros de la lista de documentos; todos opcionales. */
export interface FiltroDeDocumentosPorPagar {
  proveedorId?: string;
  /** Un estado, o `vigente` (todo menos lo anulado) o `todos`. */
  estado?: EstadoDeDocumento | 'vigente' | 'todos';
  tipo?: TipoDeDocumento;
  /** Fecha de emisión desde y hasta (`AAAA-MM-DD`), incluidas. */
  emitidosDesde?: string;
  emitidosHasta?: string;
  /** Solo los cargos con saldo cuyo vencimiento ya pasó. */
  soloVencidos?: boolean;
}

/** Qué página de la lista se pide: de 1 en adelante, con hasta `limite` documentos. */
export interface PaginacionDeDocumentos {
  pagina: number;
  limite: number;
}

/** Datos del documento que viven en Libro de compras (no se copian aquí) y del proveedor. */
export interface OrigenDelDocumento {
  proveedorNombre: string;
  serie: string | null;
  numero: string;
  fechaRecepcion: string;
  periodo: string;
  /** Cómo se anuló en Libro de compras; todo nulo si el documento no está anulado. */
  anulacion: AnulacionEnElLibro;
}

export interface AnulacionEnElLibro {
  causa: string | null;
  motivo: string | null;
  anuladoPor: string | null;
  /** Nombres y apellidos de quien anuló; `null` si no se pudo leer al usuario. */
  anuladoPorNombre: string | null;
  anuladoEn: Date | null;
}

/** Un documento con lo que se calcula de las demás tablas; el dinero va en centavos. */
export interface FilaDeDocumento {
  documento: DocumentoPorPagar;
  origen: OrigenDelDocumento;
  /** Lo que las notas de crédito rebajaron de este cargo. */
  aplicadoAlCargoCentavos: number;
  /** Lo que esta nota de crédito rebajó de cargos. */
  aplicadoPorLaNotaCentavos: number;
  notasVigentes: number;
  notasEnTotal: number;
}

export interface NotaDeUnDocumento {
  id: string;
  documentoId: string | null;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  totalCentavos: number;
  /** Lo que la nota rebajó del documento consultado. */
  aplicadoAlDocumentoCentavos: number;
}

export interface AplicacionConDatos {
  notaId: string;
  notaSerie: string | null;
  notaNumero: string;
  cargoId: string;
  cargoSerie: string | null;
  cargoNumero: string;
  montoCentavos: number;
}

/** Las cuentas del proveedor en la empresa: lo que se debe y lo que las notas dejaron a favor. */
export interface TotalesDelProveedor {
  proveedorNombre: string;
  porPagarCentavos: number;
  vencidoCentavos: number;
  cargosConSaldo: number;
}

export interface NotaConSaldoLibre {
  id: string;
  documentoId: string | null;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  saldoLibreCentavos: number;
}

/** Las consultas de la bandeja, la lista y la ficha; las tablas tienen RLS por empresa. */
export interface ConsultasDeDocumentos {
  listar(
    filtro: FiltroDeDocumentosPorPagar,
    paginacion: PaginacionDeDocumentos,
    hoy: string,
  ): Promise<{ filas: FilaDeDocumento[]; total: number }>;
  /** Lo pendiente, del más antiguo al más nuevo, hasta `limite`; con el total que hay. */
  bandeja(limite: number): Promise<{ filas: FilaDeDocumento[]; total: number }>;
  buscar(id: string): Promise<FilaDeDocumento | null>;
  /** Las notas de crédito y de débito que corrigen al documento, también las anuladas, de la más antigua a la más nueva. */
  notasDe(documento: DocumentoPorPagar): Promise<NotaDeUnDocumento[]>;
  /** Lo que el documento rebajó (si es nota de crédito) o le rebajaron (si es cargo), con los datos de los dos lados. */
  aplicacionesDe(documento: DocumentoPorPagar): Promise<AplicacionConDatos[]>;
}

/** Las cuentas de un proveedor en la empresa activa. */
export interface ConsultasDeSaldos {
  /** `null` si el proveedor no existe en la cuenta. */
  totalesDelProveedor(proveedorId: string, hoy: string): Promise<TotalesDelProveedor | null>;
  notasConSaldoLibre(proveedorId: string): Promise<NotaConSaldoLibre[]>;
  /** Los proveedores que tienen algún documento por pagar en la empresa activa, por nombre. */
  proveedoresConDocumentos(): Promise<ProveedorConDocumentosDto[]>;
}
