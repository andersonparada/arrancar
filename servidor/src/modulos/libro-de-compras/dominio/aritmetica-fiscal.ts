/**
 * Aritmética entera de los cálculos fiscales: todo en centavos, sin coma flotante.
 * Los productos intermedios usan `bigint` porque un `numeric(14,2)` multiplicado por
 * otro monto pasa de los 2^53 de un `number`.
 */

/** `n / d` redondeado a la mitad hacia arriba (para valores no negativos), igual que `round` de PostgreSQL. */
export function dividirRedondeando(n: bigint, d: bigint): bigint {
  return (2n * n + d) / (2n * d);
}

/** `monto × centésimas / 10000` redondeado: `porcentajeDe(10000, 1500)` es el 15 % de Q100.00. */
export function porcentajeDe(centavos: number, centesimas: number): number {
  return Number(dividirRedondeando(BigInt(centavos) * BigInt(centesimas), 10000n));
}

/** Un número sin signo con hasta `decimales` decimales, como entero escalado; `null` si no lo es. */
export function aEscala(texto: string, decimales: number): bigint | null {
  const partes = /^(\d+)(?:\.(\d+))?$/.exec(texto.trim());
  const fraccion = partes?.[2] ?? '';
  if (!partes || fraccion.length > decimales) return null;
  return BigInt((partes[1] ?? '') + fraccion.padEnd(decimales, '0'));
}

/** Un valor de la configuración (12 o 12.5 por ciento) en centésimas enteras: 12 → 1200. */
export function aCentesimasDeConfiguracion(valor: number): number {
  return Math.round(valor * 100);
}

/** Un monto en quetzales de la configuración (2500 o 2500.5) en centavos enteros. */
export function quetzalesACentavos(valor: number): number {
  return Math.round(valor * 100);
}

/**
 * Reparte `monto` entre `pesos` en proporción a cada peso, sin perder centavos: a cada uno
 * su parte entera y los centavos que sobran, de uno en uno, a los de mayor resto (en
 * empate, al de mayor peso y luego al primero). La suma siempre es `monto`.
 */
export function repartirProporcional(monto: number, pesos: readonly number[]): number[] {
  const suma = pesos.reduce((acumulado, peso) => acumulado + BigInt(peso), 0n);
  if (suma === 0n) return pesos.map(() => 0);
  const partes = pesos.map((peso, indice) => {
    const producto = BigInt(monto) * BigInt(peso);
    return { indice, peso, entera: producto / suma, resto: producto % suma };
  });
  const sobrante = BigInt(monto) - partes.reduce((acumulado, parte) => acumulado + parte.entera, 0n);
  const conResto = [...partes].sort(
    (a, b) => (a.resto === b.resto ? 0 : a.resto > b.resto ? -1 : 1) || b.peso - a.peso || a.indice - b.indice,
  );
  const extra = new Set(conResto.slice(0, Number(sobrante)).map((parte) => parte.indice));
  return partes.map((parte) => Number(parte.entera) + (extra.has(parte.indice) ? 1 : 0));
}
