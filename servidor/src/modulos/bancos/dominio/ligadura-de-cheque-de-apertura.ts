import { ChequeDeAperturaNoLigable } from './errores-de-cheque-de-apertura.js';
import { MovimientoAnulado, MovimientoYaRevertido } from './errores.js';
import { OrigenDelMovimientoNoCoincide } from './errores-de-origen.js';
import type { OrigenDeMovimiento } from './origen-de-movimiento.js';
import type { PropiedadesDeMovimiento } from './propiedades-de-movimiento.js';

/**
 * El posfechado de la carga inicial pasa a ser del documento de otro módulo (Cuentas por pagar liga el pago de una
 * factura del saldo inicial). No cambia monto, fecha, número, conciliación ni impresión.
 * @throws ChequeDeAperturaNoLigable si no es un posfechado de apertura, está anulado o revertido, o ya tiene origen.
 */
export function ligarAlOrigen(
  propiedades: PropiedadesDeMovimiento,
  origen: OrigenDeMovimiento,
  conceptoId: string,
): PropiedadesDeMovimiento {
  const { tipo, parteDeApertura, anuladoEn, revertidoEn, revierteAId, moduloDeOrigen } = propiedades;
  const ligable = tipo === 'cheque' && parteDeApertura === 'cheque_posfechado' && moduloDeOrigen === null;
  if (!ligable || anuladoEn || revertidoEn || revierteAId) throw new ChequeDeAperturaNoLigable();
  return { ...propiedades, moduloDeOrigen: origen.modulo, documentoDeOrigenId: origen.documentoId, conceptoId };
}

/**
 * Quita el origen que puso `ligarAlOrigen`; el concepto vuelve al que se le da (sin clasificar).
 * @throws OrigenDelMovimientoNoCoincide si el movimiento no está ligado a ese documento; MovimientoAnulado o
 * MovimientoYaRevertido si ya no está vigente.
 */
export function desligarDelOrigen(
  propiedades: PropiedadesDeMovimiento,
  origen: OrigenDeMovimiento,
  conceptoId: string,
): PropiedadesDeMovimiento {
  const { parteDeApertura, moduloDeOrigen, documentoDeOrigenId } = propiedades;
  const ligado =
    parteDeApertura === 'cheque_posfechado' &&
    moduloDeOrigen === origen.modulo &&
    documentoDeOrigenId === origen.documentoId;
  if (!ligado) throw new OrigenDelMovimientoNoCoincide();
  if (propiedades.anuladoEn) throw new MovimientoAnulado();
  if (propiedades.revertidoEn) throw new MovimientoYaRevertido();
  return { ...propiedades, moduloDeOrigen: null, documentoDeOrigenId: null, conceptoId };
}
