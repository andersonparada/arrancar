import type { ClaseFiscal, TipoDeLinea } from '../../dominio/calculo-de-lineas.js';
import type { DestinoSolicitado } from '../../dominio/destino-del-documento.js';
import type { TipoDeIdentificacion } from '../../dominio/receptor.js';
import type { FacturaAnteriorEscrita } from '../../dominio/reglas-de-notas.js';
import type { TipoDeDocumento, TipoDte } from '../../dominio/tipos-de-documento.js';

/** Una línea tal como la manda el cliente: el dinero va como texto y el total incluye el IVA. */
export interface SolicitudDeLineaDeVenta {
  conceptoDeIngresoId: string;
  /** Sin dato, el del concepto de ingreso. */
  tipo: TipoDeLinea | null;
  /** Sin dato, `gravada`. */
  claseFiscal: ClaseFiscal | null;
  descripcion: string | null;
  total: string;
  otrosImpuestos: string | null;
}

/** Lo que el cliente manda al registrar un documento de venta: nada viene calculado. */
export interface SolicitudDeDocumentoDeVenta {
  /** Familia fiscal; opcional si llega `tipoDte`, y entonces debe coincidir con él. */
  tipo: TipoDeDocumento | null;
  /** Código de la SAT; obligatorio con FEL (`autorizacionFel`). */
  tipoDte: TipoDte | null;
  clienteId: string | null;
  tipoDeIdentificacion: TipoDeIdentificacion | null;
  nitReceptor: string | null;
  nombreReceptor: string | null;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
  localidadId: string | null;
  fechaEmision: string;
  documentoAfectadoId: string | null;
  facturaAnterior: FacturaAnteriorEscrita | null;
  destino: DestinoSolicitado;
  /** El IVA que dice el DTE, si se quiere ajustar el calculado (hasta `max(5, líneas)` centavos de diferencia). */
  ivaDelDte: string | null;
  observaciones: string | null;
  lineas: SolicitudDeLineaDeVenta[];
}

export interface PeticionDeAnulacionDeVenta {
  documentoId: string;
  causa: string;
  motivo: string;
  /** La fecha de la anulación en la SAT; sin dato, hoy. */
  fechaDeAnulacion?: string | null;
}
