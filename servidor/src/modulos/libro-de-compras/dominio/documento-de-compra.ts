import type { DocumentoParaDestino } from '../../core/contratos/libro-de-compras.contratos.js';
import type { LineaCalculada } from './calculo-de-linea.js';
import type { DestinoDeDocumento } from './destinos-de-documento.js';
import type { MotivoFueraDelLibro } from './fuera-del-libro.js';
import type { ImpuestoRetenido, ReglaDeRetencion } from './retencion-propuesta.js';
import type { MotivoSinCredito, TipoDeDocumento } from './tipos-de-documento.js';
import type { TotalesDelDocumento } from './totales-del-documento.js';

/** La tasa de IDP de un combustible tal como la guarda la línea (textos de `numeric`). */
export interface CombustibleDeLineaGuardada {
  vigenciaDeCombustibleId: string;
  galones: string;
  idpPorGalon: string;
  porcentajeDeEtanol: string;
}

/** Una línea ya resuelta y calculada, lista para guardar. */
export interface LineaDeDocumento extends LineaCalculada {
  numero: number;
  conceptoId: string;
  descripcion: string | null;
  tipo: 'bien' | 'servicio';
  esActivoFijo: boolean;
  combustible: CombustibleDeLineaGuardada | null;
}

/** Una retención fijada al registrar. Centavos enteros; el porcentaje, en centésimas. */
export interface RetencionDeDocumento {
  impuesto: ImpuestoRetenido;
  regla: ReglaDeRetencion;
  base: number;
  porcentaje: number | null;
  montoPropuesto: number;
  /** Lo que queda: 0 si el usuario la quitó. */
  monto: number;
  /** Obligatorio si `monto` difiere de `montoPropuesto`. */
  motivoDelAjuste: string | null;
  fecha: string;
}

/** El documento de compra completo que se registra: encabezado con totales, líneas y retenciones. */
export interface DocumentoDeCompra {
  id: string;
  empresaId: string;
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
  totales: TotalesDelDocumento;
  observaciones: string | null;
  lineas: LineaDeDocumento[];
  retenciones: RetencionDeDocumento[];
}

/** Lo que el documento debe pagarse al proveedor: el total menos lo retenido (derivado, no se guarda). */
export function netoAPagar(documento: Pick<DocumentoDeCompra, 'totales' | 'retenciones'>): number {
  const retenido = documento.retenciones.reduce((suma, retencion) => suma + retencion.monto, 0);
  return documento.totales.total - retenido;
}

/** La serie y el número se guardan en mayúsculas y sin espacios (los mismos `check` de la tabla). */
export function normalizarSerieONumero(texto: string): string {
  return texto.replace(/\s+/g, '').toUpperCase();
}

/** Lo que recibe el destino en `<destino>.recibir_documento` y lo que lleva el evento de documento registrado. */
export function paraElDestino(documento: DocumentoDeCompra): DocumentoParaDestino {
  return {
    documentoId: documento.id,
    tipo: documento.tipo,
    proveedorId: documento.proveedorId,
    documentoAfectadoId: documento.documentoAfectadoId,
    fechaEmision: documento.fechaEmision,
    totalCentavos: documento.totales.total,
    retencionesCentavos: documento.retenciones.reduce((suma, retencion) => suma + retencion.monto, 0),
    tieneActivoFijo: documento.lineas.some((linea) => linea.esActivoFijo),
  };
}
