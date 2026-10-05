import type { DestinoDeDocumento } from '../../dominio/destinos-de-documento.js';
import type { MotivoFueraDelLibro } from '../../dominio/fuera-del-libro.js';
import type { ImpuestoRetenido, ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';
import type { MotivoSinCredito, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** Todo el dinero viaja como texto con dos decimales (`"1250.50"`). */
export interface LineaDeDocumentoDto {
  numero: number;
  conceptoId: string;
  descripcion: string | null;
  tipo: 'bien' | 'servicio';
  esActivoFijo: boolean;
  combustible: {
    vigenciaDeCombustibleId: string;
    galones: string;
    idpPorGalon: string;
    porcentajeDeEtanol: string;
  } | null;
  total: string;
  exento: string;
  idp: string;
  base: string;
  iva: string;
  ivaNoAcreditable: string;
  /** Derivado: `total − iva + iva_no_acreditable`; lo que Contabilidad llevará al gasto, activo o inventario. */
  costo: string;
}

export interface RetencionDto {
  impuesto: ImpuestoRetenido;
  regla: ReglaDeRetencion;
  base: string;
  /** Porcentaje con dos decimales (`"15.00"`); `null` en el ISR por escalones. */
  porcentaje: string | null;
  montoPropuesto: string;
  /** Lo que queda: `"0.00"` si el usuario la quitó. */
  monto: string;
  motivoDelAjuste: string | null;
  fecha: string;
}

export interface TotalesDeDocumentoDto {
  total: string;
  base: string;
  iva: string;
  ivaNoAcreditable: string;
  idp: string;
  exento: string;
}

/** El documento; en la vista previa (`/calcular`) todavía no tiene `id`. */
export interface DocumentoDto {
  id: string | null;
  tipo: TipoDeDocumento;
  proveedorId: string;
  nitEmisor: string | null;
  nombreEmisor: string;
  nitReceptor: string | null;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
  fechaEmision: string;
  fechaRecepcion: string;
  periodo: string;
  muestraEnReportesSat: boolean;
  motivoFueraDelLibro: MotivoFueraDelLibro | null;
  motivoSinCredito: MotivoSinCredito | null;
  documentoAfectadoId: string | null;
  destino: DestinoDeDocumento;
  observaciones: string | null;
  totales: TotalesDeDocumentoDto;
  /** Derivado: el total menos lo retenido. */
  netoAPagar: string;
  lineas: LineaDeDocumentoDto[];
  retenciones: RetencionDto[];
}

/** La respuesta de calcular y de registrar: el documento y los avisos que no bloquean. */
export interface DocumentoConAvisosDto {
  documento: DocumentoDto;
  avisos: string[];
}

/** Un destino al que se puede mandar un documento, con su módulo activo en la cuenta. */
export interface DestinoDto {
  clave: DestinoDeDocumento;
}

/** El destino del último documento que la empresa registró con ese proveedor; `null` si es el primero. */
export interface DestinoSugeridoDto {
  destino: DestinoDeDocumento | null;
}
