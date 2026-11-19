import type { Comprobante, DocumentoPorAsignar, ValeDeGastoSolicitado } from './tipos-de-comprobantes';

/** Lo que el servidor manda de los vales provisionales (efectivo entregado a alguien por justificar). */

export type EstadoDelVale = 'abierto' | 'liquidado' | 'anulado';

export interface ValeResumen {
  id: string;
  fondoId: string;
  numero: number;
  fecha: string;
  entregadoA: string;
  entregadoAUsuarioId: string | null;
  monto: string;
  motivo: string;
  estado: EstadoDelVale;
  fechaDeLiquidacion: string | null;
  /** Lo que regresó al fondo al liquidar. */
  devuelto: string;
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
  diasAbierto: number;
  avisos: string[];
}

export interface Vale extends ValeResumen {
  /** Lo que sumaron los comprobantes vigentes del vale (las notas de crédito restan). */
  gastado: string;
  comprobantes: Comprobante[];
}

export interface ValeSolicitado {
  fecha?: string | null;
  monto: string;
  entregadoA?: string | null;
  entregadoAUsuarioId?: string | null;
  motivo: string;
}

export interface LiquidacionSolicitada {
  fecha?: string | null;
  documentos: DocumentoPorAsignar[];
  valesDeGasto: ValeDeGastoSolicitado[];
}
