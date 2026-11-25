/** Lo que el servidor manda de los comprobantes de Caja chica; el dinero viaja como texto con dos decimales. */

export type ClaseDeComprobante = 'documento' | 'vale_de_gasto' | 'faltante' | 'sobrante';

export interface DocumentoDelComprobante {
  tipo: string;
  serie: string | null;
  numero: string;
  proveedorNombre: string;
  fechaEmision: string;
  total: string;
  enElLibro: boolean;
  motivoFueraDelLibro: string | null;
}

export type SituacionDelDocumento = 'por_resolver' | 'en_disputa' | 'resuelto';
export type SalidaDelDocumento = 'reemplazo' | 'devolucion' | 'cobro' | 'sin_recuperacion';
export type DestinoDeLaSalida = 'proveedor' | 'custodio';

/** En qué va un documento que su emisor anuló después de gastar. El efectivo no cambia en ningún caso. */
export interface SeguimientoDelDocumento {
  situacion: SituacionDelDocumento;
  salida: SalidaDelDocumento | null;
  /** La factura anulada que un reemplazo dejó atrás. */
  documentoAnuladoId: string | null;
  motivoDeLaResolucion: string | null;
  /** Lo que se recupera, en la devolución y el cobro. */
  monto: string | null;
  destino: DestinoDeLaSalida | null;
  /** En disputa: motivo, prueba de pago y hasta cuándo se puede tomar el crédito. */
  disputa: { motivo: string; prueba: string; hasta: string } | null;
}

export interface Comprobante {
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
  proveedorId: string | null;
  conRetencion: boolean;
  montoRetenido: string;
  motivoConRetencion: string | null;
  sobreElTope: boolean;
  motivoSobreElTope: string | null;
  sinBancarizar: boolean;
  conActivoFijo: boolean;
  valeProvisionalId: string | null;
  /** Solo en el faltante de un arqueo. */
  destinoDelFaltante: 'perdida' | 'cobrar_al_custodio' | null;
  numero: number | null;
  descripcion: string | null;
  pagadoA: string | null;
  motivoSinDocumento: string | null;
  asignadoEn: string | null;
  motivoDeAnulacion: string | null;
  /** Con valor, el emisor anuló la FEL: el comprobante sigue vigente y está por resolver. */
  motivoDocumentoAnulado: string | null;
  seguimiento: SeguimientoDelDocumento | null;
  reposicionNumero: number | null;
  documento: DocumentoDelComprobante | null;
}

export interface ComprobanteDeLaBandeja extends Comprobante {
  puedeAsignarConRetencion: boolean;
}

export interface ListaDeComprobantes {
  elementos: Comprobante[];
  totales: { pendiente: string; repuesto: string };
}

export interface ResultadoDeAsignar {
  comprobantes: Comprobante[];
  avisos: string[];
}

export type EstadoDeLosComprobantes = 'pendiente' | 'repuesto' | 'anulado' | 'todos';

/** Lo que se ve en la ficha: un estado del servidor o «por resolver», que se arma con todos. */
export type VistaDeComprobantes = EstadoDeLosComprobantes | 'por_resolver';

/** Cómo se resuelve un documento anulado por su emisor (la devolución y el cobro piden monto y destino). */
export interface SalidaSolicitada {
  salida: Exclude<SalidaDelDocumento, 'reemplazo'>;
  motivo: string;
  monto: string | null;
  destino: DestinoDeLaSalida | null;
}

export interface DisputaSolicitada {
  motivo: string;
  prueba: string;
}

export interface FiltroDeBandeja {
  proveedorId?: string;
  desde?: string;
  hasta?: string;
  conRetencion?: boolean;
}

export interface DocumentoPorAsignar {
  comprobanteId: string;
  fecha?: string | null;
  motivoSobreElTope?: string | null;
  motivoConRetencion?: string | null;
}

export interface ValeDeGastoSolicitado {
  fecha?: string | null;
  monto: string;
  descripcion: string;
  pagadoA: string;
  conceptoDeGastoId: string;
  motivoSinDocumento: string;
  motivoSobreElTope?: string | null;
}
