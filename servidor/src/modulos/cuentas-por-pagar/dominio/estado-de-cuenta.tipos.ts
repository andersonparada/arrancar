import type { TipoDeDocumento } from './tipos-de-documento.js';

/**
 * El estado de cuenta de un proveedor (R3, `docs/modulos/diseno-cp5-reportes.md`): los hechos del rango en orden, con el
 * saldo corrido. La consulta entrega los movimientos ya con la regla de fecha de efecto y de anulación de §2; aquí solo
 * se ordenan, se reparten en cargo y abono según la presentación y se suma.
 */

export const HECHOS_DEL_ESTADO = [
  'documento',
  'nota_de_credito',
  'pago',
  'reintegro',
  'diferencia_menor',
  'baja_de_saldo_a_favor',
  'anulacion_de_documento',
  'anulacion_de_pago',
  'anulacion_de_reintegro',
  'anulacion_de_ajuste',
] as const;
export type HechoDelEstado = (typeof HECHOS_DEL_ESTADO)[number];

export type PresentacionDelEstado = 'interna' | 'para_el_proveedor';

export interface DocumentoDelMovimiento {
  id: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
}

/** Un pago o un reintegro: su número como se lee, cómo se hizo y su referencia (cheque, recibo o boleta). */
export interface RegistroDelMovimiento {
  numero: string;
  forma: string;
  referencia: string | null;
}

/** Lo propio de un documento: total, retenciones y, en un saldo inicial, lo anterior a la fecha de inicio. */
export interface DetalleDelDocumento {
  totalCentavos: number;
  retencionesCentavos: number;
  esSaldoInicial: boolean;
  anterioresAlInicioCentavos: number | null;
}

/** Un hecho del proveedor: `esCargo` aumenta lo que se debe; el monto va siempre en positivo. */
export interface MovimientoDelProveedor {
  hecho: HechoDelEstado;
  fecha: string;
  /** Cuándo se registró (ISO), para ordenar los hechos de un mismo día. */
  registradoEn: string;
  esCargo: boolean;
  montoCentavos: number;
  /** Anulado dentro del mismo rango: no tuvo efecto, solo sale si se pidió verlo y no suma. */
  anulado: boolean;
  documento: DocumentoDelMovimiento | null;
  registro: RegistroDelMovimiento | null;
  detalle: DetalleDelDocumento | null;
}

/** Una retención que Libro de compras fijó a un documento; sin `impuesto` es la parte que no tiene detalle. */
export interface RetencionDelDocumento {
  documentoId: string;
  impuesto: 'iva' | 'isr' | null;
  montoCentavos: number;
  constanciaNumero: string | null;
}

export interface LineaDelEstado {
  fecha: string;
  hecho: HechoDelEstado | 'retencion';
  documentoId: string | null;
  concepto: string;
  totalCentavos: number | null;
  retencionesCentavos: number | null;
  anterioresAlInicioCentavos: number | null;
  cargoCentavos: number;
  abonoCentavos: number;
  /** El saldo corrido; nulo en una línea anulada, que no suma. */
  saldoCentavos: number | null;
  anulada: boolean;
}
