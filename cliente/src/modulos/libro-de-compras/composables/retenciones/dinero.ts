/** Pasa un monto en texto («1250.50») a centavos enteros; `null` si no es un importe. Acepta la coma decimal. */
export function aCentavos(monto: string | number | null | undefined): number | null {
  const partes = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(String(monto ?? '').trim());
  if (!partes) return null;
  const [, signo, enteros, decimales = ''] = partes;
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  return signo === '-' ? -centavos : centavos;
}

/** Centavos enteros como texto con dos decimales. */
export function deCentavos(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  return `${signo}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

/** La suma de varios montos en texto; los que no son importes no cuentan. */
export function sumarMontos(montos: readonly string[]): string {
  return deCentavos(montos.reduce((suma, monto) => suma + (aCentavos(monto) ?? 0), 0));
}

/** Un monto es cero si son puros ceros («0», «0.00», «-0.00»). */
export const esCero = (monto: string): boolean => aCentavos(monto) === 0;
