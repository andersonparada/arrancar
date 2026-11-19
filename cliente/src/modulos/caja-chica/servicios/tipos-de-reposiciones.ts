import type { Comprobante } from './tipos-de-comprobantes';

/** Lo que el servidor manda de las reposiciones; el dinero viaja como texto con dos decimales. */

export type FormaDeReposicion = 'cheque' | 'nota_de_debito' | 'compensada_al_cerrar';

/** Lo que se pide a Bancos por concepto; las tres partes suman el monto. */
export interface DesgloseDeReposicion {
  operacion: string;
  activo: string;
  faltante: string;
}

export interface LineaDeReposicion {
  comprobante: Comprobante;
  /** Firmado: lo que resta (notas de crédito, sobrantes) va negativo. */
  monto: string;
}

export interface ReposicionResumen {
  id: string;
  fondoId: string;
  numero: number;
  fecha: string;
  forma: FormaDeReposicion;
  monto: string;
  movimientoId: string | null;
  custodio: string;
  laHizoElCustodio: boolean;
  estado: 'vigente' | 'anulada';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

export interface Reposicion extends ReposicionResumen {
  desglose: DesgloseDeReposicion;
  lineas: LineaDeReposicion[];
  /** Avisos que no bloquean; solo llegan al registrar. */
  avisos: string[];
}

/** Lo pendiente del fondo y cómo se repartiría en Bancos si se repone todo. */
export interface SolicitudDeReposicion {
  fondoId: string;
  fondoNombre: string;
  custodio: string | null;
  pendientes: Comprobante[];
  total: string;
  desglose: DesgloseDeReposicion;
}

interface ComunDeReposicion {
  comprobanteIds: string[];
  fecha?: string;
  observaciones?: string | null;
}

/** Reponer con un cheque de una chequera o con una nota de débito a una cuenta. */
export type ReposicionSolicitada = ComunDeReposicion &
  (
    | { forma: 'cheque'; chequeraId: string; beneficiario?: string | null; noNegociable?: boolean }
    | { forma: 'nota_de_debito'; cuentaBancariaId: string; referencia?: string | null }
  );

export interface AnulacionSolicitada {
  motivo: string;
  fecha?: string;
}
