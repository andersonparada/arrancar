import {
  ComprobantesMayoresQueElEfectivo,
  FechaDelComprobanteInvalida,
  MontoDelComprobanteInvalido,
} from './errores-de-comprobantes.js';
import type { Comprobante } from './comprobantes.js';

/** El tope que rige: el del fondo o, sin él, el de la empresa; `null` si no hay tope (cero es sin tope). */
export function topeVigente(topeDelFondoCentavos: number | null, topePorOmisionCentavos: number): number | null {
  const tope = topeDelFondoCentavos ?? topePorOmisionCentavos;
  return tope > 0 ? tope : null;
}

/** @throws MontoDelComprobanteInvalido si no es mayor que cero. */
export function exigirMontoPositivo(centavos: number): number {
  if (centavos <= 0) throw new MontoDelComprobanteInvalido();
  return centavos;
}

/**
 * Cuánto sube lo pendiente de reponer cuando entra el comprobante: el cargo suma y la nota de crédito o el sobrante
 * restan (§2.3 del diseño).
 */
export const efectoEnLoPendiente = ({ montoCentavos, resta }: Pick<Comprobante, 'montoCentavos' | 'resta'>): number =>
  resta ? -montoCentavos : montoCentavos;

/** @throws FechaDelComprobanteInvalida si es futura o anterior a la apertura del fondo. */
export function exigirFechaDelComprobante(fecha: string, contexto: { hoy: string; fechaDeApertura: string }): void {
  if (fecha > contexto.hoy) throw new FechaDelComprobanteInvalida('La fecha del gasto no puede ser futura.');
  if (fecha < contexto.fechaDeApertura) {
    throw new FechaDelComprobanteInvalida('La fecha del gasto no puede ser anterior a la apertura del fondo.');
  }
}

/**
 * Que el efectivo esperado no quede negativo con el cambio (`aumentoDeLoPendiente` puede ser negativo: una nota de
 * crédito o devolver un gasto).
 * @throws ComprobantesMayoresQueElEfectivo
 */
export function exigirQueAlcanceElEfectivo(esperadoCentavos: number, aumentoDeLoPendiente: number): void {
  const quedaria = esperadoCentavos - aumentoDeLoPendiente;
  if (aumentoDeLoPendiente > 0 && quedaria < 0) throw new ComprobantesMayoresQueElEfectivo(-quedaria);
}
