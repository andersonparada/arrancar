import { toleranciaDeIvaEnCentavos } from './reparto-de-iva.js';

/** Lo que suman, en centavos, una factura y sus notas de débito (el tope) o las notas de crédito (lo acumulado). */
export interface MontosDeNotas {
  total: number;
  iva: number;
}

/** Lo que dice el tope sobre unas notas de crédito: si caben y cuántos centavos de IVA pasan de la factura (redondeo). */
export interface MedidaDelTope {
  cabe: boolean;
  /** Centavos de IVA acumulado sobre el IVA del tope; solo importa si `cabe` (dentro de la tolerancia de redondeo). */
  excesoDeIva: number;
}

/**
 * Las notas de crédito caben en la factura (con sus notas de débito) con dos topes absolutos e independientes: el total
 * acumulado no pasa del total del tope, y el IVA acumulado no pasa del IVA del tope más la tolerancia de redondeo. No se
 * compara con el IVA proporcional: una nota puede devolver solo lo gravado o solo lo exento. Cada nota redondea su IVA
 * por su cuenta, así que la tolerancia es `max(Q0.05, Q0.01 por nota de crédito vigente)`, contando la nueva.
 * Es la única regla de tope: registrar una nota y dar de baja una nota de débito la comparten.
 */
export function medirElTopeDeNotasDeCredito(
  tope: MontosDeNotas,
  acumulado: MontosDeNotas & { notasDeCredito: number },
): MedidaDelTope {
  const excesoDeIva = Math.max(0, acumulado.iva - tope.iva);
  const cabe = acumulado.total <= tope.total && excesoDeIva <= toleranciaDeIvaEnCentavos(acumulado.notasDeCredito);
  return { cabe, excesoDeIva };
}
