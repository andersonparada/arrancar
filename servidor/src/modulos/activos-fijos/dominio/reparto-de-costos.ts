import { DemasiadasUnidades, MontoDeCostoInvalido } from './errores-de-costo.js';
import { MAXIMO_DE_UNIDADES } from './tipos-de-costo.js';

/**
 * Reparte un monto en centavos entre `partes` activos iguales: cada uno recibe `floor(monto / partes)` y el último el
 * sobrante (Q750,000.01 en 3 da 250,000.00, 250,000.00 y 250,000.01). Con un monto negativo (nota de crédito) reparte su
 * valor absoluto y devuelve las partes con signo, así la suma siempre es el monto.
 * @throws MontoDeCostoInvalido si el monto es cero, no es entero o no alcanza un centavo por parte.
 */
export function repartirEnPartes(montoCentavos: number, partes: number): number[] {
  if (!Number.isInteger(montoCentavos) || montoCentavos === 0)
    throw new MontoDeCostoInvalido('Escriba un monto distinto de cero.');
  const signo = montoCentavos < 0 ? -1 : 1;
  const absoluto = Math.abs(montoCentavos);
  const base = Math.floor(absoluto / partes);
  if (base === 0) throw new MontoDeCostoInvalido(`El monto no alcanza para repartirlo entre ${partes} unidades.`);
  const reparto = Array.from({ length: partes }, () => base);
  reparto[partes - 1] = absoluto - base * (partes - 1);
  return reparto.map((parte) => parte * signo);
}

/**
 * Las unidades de una asignación: un entero desde 1 que no pasa del tope por operación.
 * @throws MontoDeCostoInvalido si no es un entero desde 1.
 * @throws DemasiadasUnidades si pasa del tope.
 */
export function unidadesValidas(unidades: number): number {
  if (!Number.isInteger(unidades) || unidades < 1)
    throw new MontoDeCostoInvalido('Las unidades son un entero desde 1.');
  if (unidades > MAXIMO_DE_UNIDADES) throw new DemasiadasUnidades();
  return unidades;
}
