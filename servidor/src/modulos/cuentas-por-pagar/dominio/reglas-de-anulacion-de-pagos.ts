import { PagoCobrado } from './errores-de-anulacion-de-pagos.js';
import type { PagoConLineas } from './pago-con-lineas.js';
import { numeroDelPago } from './pagos.js';

/** Un pago vigente con lo que Bancos dice de su movimiento, para revisar si se puede anular o reaplicar. */
export interface PagoPorRevisar {
  pago: PagoConLineas;
  /** El movimiento del pago ya está conciliado (el banco lo pagó). */
  conciliado: boolean;
}

/**
 * Una regla que puede rechazar anular o reaplicar un pago lanzando su error. Las listas se arman al componer el módulo, así
 * que Contabilidad sumará la suya (mes cerrado) sin tocar los casos de uso.
 */
export type ReglaDePago = (revision: PagoPorRevisar) => void | Promise<void>;

/**
 * Un cheque o una nota ya conciliados los pagó el banco: no se anulan. Se reaplica el pago a otros documentos o, si el
 * proveedor devolvió el dinero, se registra un reintegro.
 */
export const noEstarCobrado: ReglaDePago = ({ pago, conciliado }) => {
  if (conciliado) throw new PagoCobrado(numeroDelPago(pago.numero, pago.anioDeNumero));
};

/** Las reglas de anular un pago, desde aquí o por aviso de Bancos. */
export const REGLAS_PARA_ANULAR_PAGO: readonly ReglaDePago[] = [noEstarCobrado];

/** Las reglas de reaplicar un pago: ninguna hasta que Contabilidad sume la del mes cerrado. */
export const REGLAS_PARA_REAPLICAR_PAGO: readonly ReglaDePago[] = [];

/** Corre las reglas en orden; la primera que se infringe lanza su error. */
export async function revisarReglasDePago(reglas: readonly ReglaDePago[], revision: PagoPorRevisar): Promise<void> {
  for (const regla of reglas) await regla(revision);
}
