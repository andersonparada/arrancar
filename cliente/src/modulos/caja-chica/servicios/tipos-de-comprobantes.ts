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
  numero: number | null;
  descripcion: string | null;
  pagadoA: string | null;
  motivoSinDocumento: string | null;
  asignadoEn: string | null;
  motivoDeAnulacion: string | null;
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
