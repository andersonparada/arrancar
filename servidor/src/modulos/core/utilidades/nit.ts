export const NIT_CONSUMIDOR_FINAL = 'CF';

/** Quita espacios y guiones y pasa a mayúsculas: "1234567-k" → "1234567K". */
export function normalizarNit(nit: string): string {
  return nit.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Valida un NIT de Guatemala (ya normalizado) con su dígito verificador módulo 11.
 * El último carácter es el verificador (0-9 o K). "CF" se acepta como consumidor final.
 */
export function esNitValido(nit: string): boolean {
  if (nit === NIT_CONSUMIDOR_FINAL) return true;
  if (!/^\d{1,12}[\dK]$/.test(nit)) return false;

  const cuerpo = nit.slice(0, -1);
  const verificador = nit.slice(-1);
  let suma = 0;
  for (let i = 0; i < cuerpo.length; i++) {
    const peso = cuerpo.length + 1 - i;
    suma += Number(cuerpo[i]) * peso;
  }
  const resultado = (11 - (suma % 11)) % 11;
  const esperado = resultado === 10 ? 'K' : String(resultado);
  return verificador === esperado;
}
