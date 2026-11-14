/** Pasa un monto escrito («1250.5»; un campo numérico entrega un número) a centavos enteros; `null` si no es un importe válido de hasta dos decimales. */
export function centavosDe(monto: string | number): number | null {
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(monto).trim());
  if (!partes) return null;
  return Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
}

/** Centavos enteros como texto con dos decimales. */
export function textoDeCentavos(centavos: number): string {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}

const dosCifras = (numero: number): string => String(numero).padStart(2, '0');

/** La fecha de hoy como `AAAA-MM-DD`, en la zona del usuario. */
export function fechaDeHoy(ahora: Date = new Date()): string {
  return `${ahora.getFullYear()}-${dosCifras(ahora.getMonth() + 1)}-${dosCifras(ahora.getDate())}`;
}
