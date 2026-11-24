import type { ClaseDeComprobante } from '../../dominio/comprobantes.js';

/** Lo que el libro dice del documento (para mostrar la bandeja y el fondo sin ir al libro). */
export interface DocumentoDelComprobanteDto {
  tipo: string;
  serie: string | null;
  numero: string;
  proveedorNombre: string;
  fechaEmision: string;
  total: string;
  enElLibro: boolean;
  motivoFueraDelLibro: string | null;
}

/** Un comprobante: documento, vale de gasto, faltante o sobrante. El dinero viaja como texto con dos decimales. */
export interface ComprobanteDto {
  id: string;
  fondoId: string | null;
  clase: ClaseDeComprobante;
  estado: 'vigente' | 'anulado';
  fecha: string;
  /** Lo que sale del fondo: en un documento con retención, el neto. */
  monto: string;
  resta: boolean;
  esNotaDeCredito: boolean;
  documentoDeCompraId: string | null;
  documentoAfectadoId: string | null;
  proveedorId: string | null;
  conRetencion: boolean;
  montoRetenido: string;
  motivoConRetencion: string | null;
  conActivoFijo: boolean;
  sobreElTope: boolean;
  motivoSobreElTope: string | null;
  sinBancarizar: boolean;
  /** El vale provisional que se liquidó con este comprobante, si lo hubo. */
  valeProvisionalId: string | null;
  /** Solo en el faltante de un arqueo. */
  destinoDelFaltante: 'perdida' | 'cobrar_al_custodio' | null;
  numero: number | null;
  descripcion: string | null;
  pagadoA: string | null;
  conceptoDeGastoId: string | null;
  motivoSinDocumento: string | null;
  asignadoEn: string | null;
  asignadoPor: string | null;
  motivoDeAnulacion: string | null;
  /** Con valor, el emisor anuló la FEL y el comprobante está «documento anulado, por resolver»; el efectivo no cambia. */
  motivoDocumentoAnulado: string | null;
  /** Está en una reposición vigente (su número); `null` si sigue pendiente. */
  reposicionNumero: number | null;
  documento: DocumentoDelComprobanteDto | null;
}

/** Un documento de la bandeja: dice si quien consulta puede asignarlo aunque lleve retención. */
export interface ComprobanteDeLaBandejaDto extends ComprobanteDto {
  puedeAsignarConRetencion: boolean;
}

export interface TotalesDeComprobantesDto {
  /** Pendiente de reponer entre los vigentes de la lista (las notas restan). */
  pendiente: string;
  repuesto: string;
}

export interface ListaDeComprobantesDto {
  elementos: ComprobanteDto[];
  totales: TotalesDeComprobantesDto;
}

/** Lo que responde asignar documentos o registrar un vale: lo creado y los avisos que no bloquean. */
export interface ResultadoDeAsignarDto {
  comprobantes: ComprobanteDto[];
  avisos: string[];
}
