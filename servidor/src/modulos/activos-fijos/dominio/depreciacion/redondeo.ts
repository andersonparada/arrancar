/**
 * `numerador / denominador` redondeado al entero más cercano, con la mitad hacia arriba, solo con enteros no negativos
 * (BigInt por dentro: un costo por un porcentaje puede pasar de lo que un `number` guarda sin error).
 */
export function dividirRedondeando(numerador: number | bigint, denominador: number | bigint): number {
  const d = BigInt(denominador);
  return Number((2n * BigInt(numerador) + d) / (2n * d));
}

/** Un porcentaje con dos decimales como texto (`"33.33"`) en centésimas enteras (`3333`). */
export function aCentesimas(porcentaje: string): number {
  return Math.round(Number(porcentaje) * 100);
}
