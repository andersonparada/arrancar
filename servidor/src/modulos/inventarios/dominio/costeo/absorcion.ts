import { proporcion } from './escalas.js';
import type { Factor } from './tipos.js';

export interface Absorcion {
  readonly absorbido: bigint;
  readonly aResultados: bigint;
}

/**
 * Parte que absorbe la existencia (entra como movimiento de valor) y parte que va a resultados (§7.5):
 * `absorbido = round(parte × f)`. `valorQueQueda` es el valor actual de lo que queda (capa o artículo): una
 * rebaja nunca lo deja negativo y el exceso también va a resultados.
 */
export function absorberConFactor(parte: bigint, factor: Factor, valorQueQueda: bigint): Absorcion {
  if (factor.numerador <= 0n) return { absorbido: 0n, aResultados: parte };
  let absorbido = proporcion(parte, factor.numerador, factor.denominador);
  if (absorbido < 0n && -absorbido > valorQueQueda) absorbido = -valorQueQueda;
  return { absorbido, aResultados: parte - absorbido };
}
