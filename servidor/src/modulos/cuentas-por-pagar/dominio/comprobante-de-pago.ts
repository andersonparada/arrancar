import type { FormaDePago } from './pagos.js';

/** Las leyendas del contador: el comprobante informa, no es un documento tributario. */
export const LEYENDA_DE_CONSTANCIAS = 'Las retenciones se documentan con su constancia.';
export const LEYENDA_DEL_COMPROBANTE = 'Este comprobante no es un documento tributario.';
export const LEYENDA_DEL_RECIBO = 'Este recibo no es un documento tributario.';

const TITULOS: Record<FormaDePago, string> = {
  cheque: 'Comprobante de pago con cheque',
  nota_de_debito: 'Comprobante de pago con nota de débito',
  nota_ligada: 'Comprobante de pago con nota de débito',
  cuenta_de_apertura: 'Comprobante de aplicación a la cuenta de apertura',
  efectivo: 'Recibo de pago en efectivo',
};

/** El pago en efectivo no tiene cheque ni nota propios: el comprobante es el recibo que el proveedor firma. */
export const esReciboDeEfectivo = (forma: FormaDePago): boolean => forma === 'efectivo';

export const tituloDelComprobante = (forma: FormaDePago): string => TITULOS[forma];

/** La leyenda de que no es documento tributario y la de las constancias, en ese orden. */
export const leyendasDelComprobante = (forma: FormaDePago): string[] => [
  LEYENDA_DE_CONSTANCIAS,
  esReciboDeEfectivo(forma) ? LEYENDA_DEL_RECIBO : LEYENDA_DEL_COMPROBANTE,
];

/**
 * Los rótulos de las firmas: «Entregado por» (el custodio, en efectivo; si no, la empresa) y «Recibí conforme» de quien
 * recibe por el proveedor, con su DPI a mano (el DPI no se guarda).
 */
export function rotulosDeFirmas(forma: FormaDePago): { entrega: string; recibe: string } {
  return {
    entrega: esReciboDeEfectivo(forma) ? 'Entregado por (custodio)' : 'Entregado por (empresa)',
    recibe: 'Recibí conforme (nombre, DPI y firma de quien recibe por el proveedor)',
  };
}
