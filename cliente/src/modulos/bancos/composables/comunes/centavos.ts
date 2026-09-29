/**
 * El dinero viaja como texto con dos decimales (por ejemplo 1250.50). Para sumar se pasa a centavos enteros: nunca
 * se suman los decimales como números, para que Q 0.10 + Q 0.20 sea Q 0.30 exacto.
 */
export function aCentavos(monto: string): number {
  const partes = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(monto.trim());
  if (!partes) throw new Error(`El monto "${monto}" no es un importe válido.`);
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
