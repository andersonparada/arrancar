/** Quita los ceros que sobran de una cantidad decimal del servidor: «24.00000000» es «24». */
export function sinCerosFinales(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor.includes('.') ? valor.replace(/\.?0+$/, '') : valor;
}
