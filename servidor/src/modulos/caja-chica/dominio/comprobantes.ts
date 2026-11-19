/** El recurso de auditoría y de eventos de los comprobantes. */
export const RECURSO_DE_COMPROBANTES = 'caja-chica.comprobantes';

export type ClaseDeComprobante = 'documento' | 'vale_de_gasto' | 'faltante' | 'sobrante';

/** Lo que Libro de compras dice del documento que respalda un comprobante (solo para mostrar y evaluar). */
export interface DocumentoDelComprobante {
  tipo: string;
  serie: string | null;
  numero: string;
  proveedorNombre: string;
  fechaEmision: string;
  totalCentavos: number;
  /** `false` cuando el documento quedó fuera del libro (sin crédito fiscal ni deducible). */
  enElLibro: boolean;
  motivoFueraDelLibro: string | null;
}

/**
 * Lo que gasta o desajusta el fondo. Un documento sin `fondoId` está en la bandeja, esperando que lo asignen. «Repuesto»
 * es estar en una reposición vigente (`reposicionNumero`). Con `resta` (nota de crédito) baja lo pendiente de reponer.
 */
export interface Comprobante {
  id: string;
  fondoId: string | null;
  clase: ClaseDeComprobante;
  estado: 'vigente' | 'anulado';
  fecha: string;
  montoCentavos: number;
  resta: boolean;
  esNotaDeCredito: boolean;
  documentoDeCompraId: string | null;
  documentoAfectadoId: string | null;
  proveedorId: string | null;
  conRetencion: boolean;
  montoRetenidoCentavos: number;
  motivoConRetencion: string | null;
  conActivoFijo: boolean;
  sobreElTope: boolean;
  motivoSobreElTope: string | null;
  sinBancarizar: boolean;
  /** El vale provisional que se liquidó con este comprobante, si lo hubo. */
  valeProvisionalId: string | null;
  /** Solo en el faltante de un arqueo: qué se hace con él. */
  destinoDelFaltante: 'perdida' | 'cobrar_al_custodio' | null;
  numero: number | null;
  anioDeNumero: number;
  descripcion: string | null;
  pagadoA: string | null;
  conceptoDeGastoId: string | null;
  motivoSinDocumento: string | null;
  asignadoEn: string | null;
  asignadoPor: string | null;
  motivoDeAnulacion: string | null;
  reposicionNumero: number | null;
  documento: DocumentoDelComprobante | null;
}

/** Cómo se nombra un comprobante en los mensajes: «A-12» o «vale 5». */
export function etiquetaDelComprobante(comprobante: Pick<Comprobante, 'documento' | 'numero' | 'clase'>): string {
  const { documento } = comprobante;
  if (documento) return `${documento.serie ? `${documento.serie}-` : ''}${documento.numero}`;
  return comprobante.clase === 'vale_de_gasto' ? `vale ${comprobante.numero}` : 'sin documento';
}
