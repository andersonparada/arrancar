/**
 * El dinero viaja como texto (`"1250.50"`) y se suma en centavos enteros: en
 * punto flotante, 0.1 + 0.2 no da 0.3 y los saldos se descuadran.
 */
export function aCentavos(monto: string): number {
  const limpio = monto.trim();
  const [enteros = '0', decimales = ''] = limpio.replace(/^-/, '').split('.');
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0').slice(0, 2));
  return limpio.startsWith('-') ? -centavos : centavos;
}

/** Centavos enteros como texto con dos decimales: `-15050` → `"-150.50"`. */
export function deCentavos(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  return `${signo}${Math.trunc(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

/** Cuánto mueve el saldo un movimiento, en centavos: positivo si entra (crédito), negativo si sale. */
export function efectoEnCentavos(tipo: 'credito' | 'debito' | 'cheque', monto: string): number {
  const centavos = aCentavos(monto);
  return tipo === 'credito' ? centavos : -centavos;
}
