/**
 * Forma comparable de un número de cuenta: sin guiones, espacios ni otros
 * separadores y en mayúsculas, para que «3-033-01234-5» y «3033012345» sean la
 * misma cuenta. Se usa solo para la unicidad y para buscar; a la pantalla va lo
 * que escribió el usuario. Las mayúsculas cubren las cuentas con letras, que los
 * bancos escriben sin distinguirlas.
 */
export function normalizarNumeroDeCuenta(numero: string): string {
  return numero.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}
