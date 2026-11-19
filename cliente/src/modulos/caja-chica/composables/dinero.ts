/** Pasa un monto escrito («1250.5») a centavos enteros; `null` si no es un importe válido de hasta dos decimales. */
export function centavosDe(monto: string | number): number | null {
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(monto).trim());
  if (!partes) return null;
  return Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
}

/** Centavos enteros como texto con dos decimales. */
export function textoDeCentavos(centavos: number): string {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}

/** Suma montos escritos; los que no son un importe válido cuentan como cero. */
export const sumarMontos = (montos: readonly string[]): string =>
  textoDeCentavos(montos.reduce((suma, monto) => suma + (centavosDe(monto) ?? 0), 0));
