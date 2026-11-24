import { dividirRedondeando } from './aritmetica-fiscal.js';
import { TOLERANCIA_MINIMA_DE_IVA_EN_CENTAVOS } from './reparto-de-iva.js';

/** Lo que suman, en centavos, una factura y sus notas de débito (el tope) o las notas de crédito (lo acumulado). */
export interface MontosDeNotas {
  total: number;
  iva: number;
}

/**
 * Las notas de crédito caben en la factura (con sus notas de débito) si su total no pasa del tope y su IVA no pasa del
 * IVA proporcional al total acumulado más `TOLERANCIA_MINIMA_DE_IVA_EN_CENTAVOS` (Q0.05): cada nota redondea su IVA por
 * su cuenta, así que varias notas parciales pueden sumar unos centavos más que la parte de la factura que corrigen.
 * Es la única regla de tope: registrar una nota y dar de baja una nota de débito la comparten.
 */
export function notasDeCreditoCaben(tope: MontosDeNotas, acumulado: MontosDeNotas): boolean {
  if (acumulado.total > tope.total) return false;
  if (tope.total <= 0) return acumulado.iva <= tope.iva + TOLERANCIA_MINIMA_DE_IVA_EN_CENTAVOS;
  const proporcional = Number(dividirRedondeando(BigInt(tope.iva) * BigInt(acumulado.total), BigInt(tope.total)));
  return acumulado.iva <= proporcional + TOLERANCIA_MINIMA_DE_IVA_EN_CENTAVOS;
}
