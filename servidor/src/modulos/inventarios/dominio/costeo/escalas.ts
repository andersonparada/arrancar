/** Cantidades en diezmilésimas enteras: `1.5` lb es `15000n`. */
export const ESCALA_CANTIDAD = 10_000n;

/** Costos unitarios en millonésimas enteras de quetzal: `Q2.10` es `2_100_000n`. */
export const ESCALA_COSTO_UNITARIO = 1_000_000n;

/** Pasa de centavos por diezmilésima a millonésimas de quetzal por unidad (hay 100 centavos por quetzal). */
const FACTOR_UNITARIO = (ESCALA_CANTIDAD * ESCALA_COSTO_UNITARIO) / 100n;

/**
 * Divide enteros y redondea al más cercano; la mitad se aleja de cero (mitad hacia arriba en los
 * positivos, que son los de las pruebas). Nunca usa coma flotante.
 */
export function dividirRedondeado(numerador: bigint, denominador: bigint): bigint {
  if (denominador <= 0n) throw new RangeError('El denominador debe ser mayor que cero.');
  const absoluto = numerador < 0n ? -numerador : numerador;
  const cociente = (2n * absoluto + denominador) / (2n * denominador);
  return numerador < 0n ? -cociente : cociente;
}

/** `round(valor × parte / total)`, la proporción que usan salidas, absorciones y repartos. */
export function proporcion(valor: bigint, parte: bigint, total: bigint): bigint {
  return dividirRedondeado(valor * parte, total);
}

/** Costo unitario (millonésimas) de `valor` centavos repartidos en `cantidad` diezmilésimas. */
export function costoUnitarioDe(valor: bigint, cantidad: bigint): bigint {
  return dividirRedondeado(valor * FACTOR_UNITARIO, cantidad);
}

/** Valor en centavos de `cantidad` diezmilésimas al costo unitario dado (millonésimas). */
export function valorDe(costoUnitario: bigint, cantidad: bigint): bigint {
  return dividirRedondeado(costoUnitario * cantidad, FACTOR_UNITARIO);
}
