import type { DestinoDeDocumento } from '../../dominio/destinos-de-documento.js';
import type { EstadoDeDte, EstadoDeDteEnLaSat, MotivoDeBloqueo } from '../../dominio/estado-de-dte.js';
import type { TipoDte } from '../../dominio/tipos-de-documento.js';

/** Lo que el usuario completó de una fila; `null` es «sin completar» (se usa la propuesta). */
export interface BorradorDeDteDto {
  proveedorId: string | null;
  conceptoId: string | null;
  destino: DestinoDeDocumento | null;
  fechaRecepcion: string | null;
  periodo: string | null;
  noVinculado: boolean;
  documentoAfectadoId: string | null;
}

/** Lo que se usaría si el usuario no cambia nada: se calcula al mostrar y no se guarda hasta que el usuario lo acepta. */
export interface PropuestaDeDteDto {
  /** El proveedor del NIT del emisor, si existe y está activo; `null`: proveedor nuevo. */
  proveedorId: string | null;
  /** El concepto de la última línea registrada con ese proveedor. */
  conceptoId: string | null;
  /** El destino del último documento de ese proveedor, si sigue activo. */
  destino: DestinoDeDocumento | null;
  /** La fecha de emisión. */
  fechaRecepcion: string;
  /** Agente de retención del IVA: la recepción no se supone y hay que escribirla (o aplicar la propuesta). */
  recepcionObligatoria: boolean;
  /** El período según la regla de siempre y el control de períodos. */
  periodo: string;
  /** Por qué se propuso otro período distinto del que correspondía (el primero estaba declarado y bloqueado). */
  avisoDelPeriodo: string | null;
}

/** Una fila de la bandeja: los datos del DTE, dónde está y lo que falta completar. Montos como texto. */
export interface DteRecibidoDto {
  id: string;
  autorizacionFel: string;
  tipoDte: TipoDte;
  serie: string;
  numero: string;
  fechaEmision: string;
  nitEmisor: string;
  nombreEmisor: string;
  nitReceptor: string;
  total: string;
  iva: string;
  idp: string;
  otrosImpuestos: string;
  otrosImpuestosDetalle: Record<string, string>;
  estadoSat: EstadoDeDteEnLaSat;
  anuladoEnLaSatEl: string | null;
  loteId: string;
  estado: EstadoDeDte;
  documentoId: string | null;
  motivoDeDescarte: string | null;
  descartadoEn: string | null;
  motivoDeBloqueo: MotivoDeBloqueo | null;
  borrador: BorradorDeDteDto;
  /** Solo en las filas pendientes. */
  propuesta: PropuestaDeDteDto | null;
}

export interface PaginaDeDteRecibidosDto {
  elementos: DteRecibidoDto[];
  total: number;
  pagina: number;
  limite: number;
}

/** Una fila confirmada: su documento y los avisos del registro; o el error que la dejó pendiente. */
export type ResultadoDeConfirmacion =
  | { id: string; documentoId: string; avisos: string[] }
  | { id: string; error: { codigo: string; mensaje: string; detalles?: unknown } };

export interface ResultadosDeConfirmacionDto {
  resultados: ResultadoDeConfirmacion[];
}
