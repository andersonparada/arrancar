import type { DestinoDeDocumentoDeVenta } from '../../../core/contratos/libro-de-ventas.contratos.js';
import type { CausaDeAnulacion } from '../../dominio/baja-de-documento.js';
import type { ClaseFiscal, TipoDeLinea } from '../../dominio/calculo-de-lineas.js';
import type { TipoDeIdentificacion } from '../../dominio/receptor.js';
import type { RegimenDeIsr, RegimenDeIva } from '../../dominio/regimen-de-la-empresa.js';
import type { TipoDeDocumento, TipoDte } from '../../dominio/tipos-de-documento.js';

/** Una línea del documento; el dinero, como texto con dos decimales. */
export interface LineaDeVentaDto {
  id: string;
  orden: number;
  conceptoDeIngresoId: string;
  conceptoDeIngresoNombre: string;
  tipo: TipoDeLinea;
  claseFiscal: ClaseFiscal;
  descripcion: string | null;
  total: string;
  base: string;
  iva: string;
  otrosImpuestos: string;
}

/** Los totales del documento por columna del libro. */
export interface TotalesDeVentaDto {
  total: string;
  gravadoBienes: string;
  gravadoServicios: string;
  exento: string;
  exportacion: string;
  iva: string;
  otrosImpuestos: string;
}

/** Una nota que corrige a la factura. */
export interface NotaDeLaFacturaDto {
  id: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: string;
  estado: 'vigente' | 'anulado';
}

export interface AnulacionDeVentaDto {
  anuladoEn: string;
  anuladoPor: string;
  motivo: string;
  causa: CausaDeAnulacion;
  /** La de la SAT o la del día en que se anuló el registro (`AAAA-MM-DD`). */
  fecha: string;
}

export interface FacturaAnteriorDto {
  serie: string | null;
  numero: string;
  fecha: string;
}

/** Una fila de la lista. */
export interface DocumentoDeVentaListadoDto {
  id: string;
  tipo: TipoDeDocumento;
  tipoDte: TipoDte | null;
  clienteId: string | null;
  tipoDeIdentificacion: TipoDeIdentificacion;
  nitReceptor: string;
  nombreReceptor: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  periodo: string;
  destino: DestinoDeDocumentoDeVenta | null;
  estado: 'vigente' | 'anulado';
  muestraEnReportesSat: boolean;
  regimenIvaDeLaEmpresa: RegimenDeIva;
  documentoAfectadoId: string | null;
  total: string;
  iva: string;
  /** La cartera ya lo procesó. */
  procesado: boolean;
  puedeAnular: boolean;
  puedeEliminar: boolean;
}

/** La ficha de un documento: encabezado, líneas y las notas que lo corrigen. */
export interface DocumentoDeVentaFichaDto extends DocumentoDeVentaListadoDto {
  origen: 'manual' | 'bandeja_sat' | 'fel';
  autorizacionFel: string | null;
  localidadId: string | null;
  regimenIsrDeLaEmpresa: RegimenDeIsr | null;
  facturaAnterior: FacturaAnteriorDto | null;
  moneda: string;
  observaciones: string | null;
  totales: TotalesDeVentaDto;
  lineas: LineaDeVentaDto[];
  notas: NotaDeLaFacturaDto[];
  anulacion: AnulacionDeVentaDto | null;
}

/** Los filtros de la lista; todos opcionales. */
export interface FiltroDeDocumentosDeVenta {
  /** Cualquier fecha del mes del libro (`AAAA-MM-DD`): se filtra por ese mes. */
  periodo?: string;
  clienteId?: string;
  tipo?: TipoDeDocumento;
  /** `vigente` oculta los anulados, `anulado` solo los anulados y `todos` no filtra. */
  estado?: 'vigente' | 'anulado' | 'todos';
  destino?: DestinoDeDocumentoDeVenta | 'ninguno';
  /** Busca en serie, número y nombre o NIT del receptor. */
  texto?: string;
}

export interface PaginacionDeDocumentosDeVenta {
  pagina: number;
  limite: number;
}

export interface PaginaDeDocumentosDeVentaDto {
  elementos: DocumentoDeVentaListadoDto[];
  total: number;
  pagina: number;
  limite: number;
}

export interface RegistroDeDocumentoDeVentaDto {
  documento: DocumentoDeVentaFichaDto;
  /** Lo que el usuario debe saber y no bloquea el registro. */
  avisos: string[];
}

export interface AnulacionDeDocumentoDeVentaDto {
  documento: DocumentoDeVentaFichaDto;
  avisos: string[];
}

export interface EliminacionDeDocumentoDeVentaDto {
  avisos: string[];
}
