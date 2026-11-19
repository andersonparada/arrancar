import type { ClaseDeComprobante } from './comprobantes.js';

/** El recurso de auditoría y de eventos de las reposiciones. */
export const RECURSO_DE_REPOSICIONES = 'caja-chica.reposiciones';

/** Cómo vuelve el dinero al fondo; `compensada_al_cerrar` es la del cierre (CC-7) y no se pide desde la ventana de reponer. */
export type FormaDeReposicion = 'cheque' | 'nota_de_debito' | 'compensada_al_cerrar';

/** Una reposición: lo que devuelve al fondo lo gastado, con el cheque o la nota de Bancos que lo respalda. */
export interface Reposicion {
  id: string;
  fondoId: string;
  numero: number;
  anioDeNumero: number;
  fecha: string;
  forma: FormaDeReposicion;
  montoCentavos: number;
  movimientoId: string | null;
  custodio: string;
  laHizoElCustodio: boolean;
  estado: 'vigente' | 'anulada';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

/** El comprobante que cubre una reposición, con su monto firmado (lo que resta va negativo). */
export interface LineaDeReposicion {
  comprobanteId: string;
  montoCentavos: number;
}

/** Lo que del comprobante hace falta para repartir una reposición por concepto de Bancos. */
export interface ComprobanteParaDesglosar {
  clase: ClaseDeComprobante;
  conActivoFijo: boolean;
  /** Con signo: la nota de crédito y el sobrante van negativos. */
  firmadoCentavos: number;
}

/** El reparto de una reposición por concepto de Bancos; las tres partes suman el monto. */
export interface DesgloseDeReposicion {
  operacionCentavos: number;
  activoCentavos: number;
  faltanteCentavos: number;
}
