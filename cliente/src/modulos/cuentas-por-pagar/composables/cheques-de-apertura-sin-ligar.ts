import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ChequesDeAperturaSinLigar } from '../servicios/tipos';

/**
 * El aviso de los posfechados de apertura que ningún pago ha ligado (AP-0): sus facturas del saldo inicial siguen
 * pendientes y no deben pagarse otra vez. `null` si no hay ninguno.
 */
export function avisoDeChequesDeAperturaSinLigar(cheques: ChequesDeAperturaSinLigar | null | undefined): string | null {
  if (!cheques || cheques.cantidad <= 0) return null;
  const quienes = cheques.cantidad === 1 ? '1 cheque posfechado' : `${cheques.cantidad} cheques posfechados`;
  return `Hay ${quienes} de apertura sin ligar (${formatearMonto(cheques.total)}): no pague estas facturas otra vez; se podrán ligar pronto.`;
}
