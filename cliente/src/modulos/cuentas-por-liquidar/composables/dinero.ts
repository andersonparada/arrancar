/** Pasa un monto escrito («1250.5»; un campo numérico entrega un número) a centavos enteros; `null` si no es un importe válido. */
export function centavosDe(monto: string | number): number | null {
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(monto).trim());
  if (!partes) return null;
  return Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
}

/** Centavos enteros como texto con dos decimales (los negativos conservan el signo). */
export function textoDeCentavos(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const valor = Math.abs(centavos);
  return `${signo}${Math.floor(valor / 100)}.${String(valor % 100).padStart(2, '0')}`;
}

/** Un monto del servidor (puede ser negativo, «-45.50») en centavos; 0 si no se entiende. */
export function centavosDelServidor(monto: string): number {
  const negativo = monto.trim().startsWith('-');
  const centavos = centavosDe(monto.replace('-', '')) ?? 0;
  return negativo ? -centavos : centavos;
}

/** Suma montos de texto con dos decimales sin errores de punto flotante. */
export const sumarMontos = (montos: readonly string[]): string =>
  textoDeCentavos(montos.reduce((total, monto) => total + centavosDelServidor(monto), 0));

/** Lo más que cabe en un monto de dinero: 999,999,999,999.99 (`numeric(14,2)`), en centavos. */
export const MONTO_MAXIMO_EN_CENTAVOS = 99_999_999_999_999;
