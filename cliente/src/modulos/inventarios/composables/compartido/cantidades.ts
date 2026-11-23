/** Quita los ceros que sobran de una cantidad decimal del servidor: «24.00000000» es «24». */
export function sinCerosFinales(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor.includes('.') ? valor.replace(/\.?0+$/, '') : valor;
}

/** El texto decimal como entero en la escala dada (`'12.5'` con 4 decimales es `125000n`), sin pasar por `number`. */
function aEscala(valor: string, decimales: number): bigint {
  const negativo = valor.trim().startsWith('-');
  const [entera = '0', fraccion = ''] = valor.trim().replace('-', '').split('.');
  const escalado = BigInt(entera + fraccion.padEnd(decimales, '0').slice(0, decimales));
  return negativo ? -escalado : escalado;
}

/**
 * La suma exacta de textos decimales (cantidades con 4 decimales, dinero con 2), como texto con esos decimales. Los
 * `null` (costos que el usuario no ve) no suman; si todos faltan, devuelve `null`.
 */
export function sumarDecimales(valores: (string | null)[], decimales: number): string | null {
  const presentes = valores.filter((valor): valor is string => valor !== null && valor !== '');
  if (!presentes.length) return null;
  const total = presentes.reduce((suma, valor) => suma + aEscala(valor, decimales), 0n);
  const texto = (total < 0n ? -total : total).toString().padStart(decimales + 1, '0');
  const entera = texto.slice(0, texto.length - decimales);
  const fraccion = texto.slice(texto.length - decimales);
  return `${total < 0n ? '-' : ''}${entera}${decimales ? `.${fraccion}` : ''}`;
}

/** ¿Es un número positivo escrito como cantidad (hasta 4 decimales)? Para revisar antes de enviar. */
export const esCantidadPositiva = (valor: string | number | null | undefined): boolean => {
  const texto = String(valor ?? '').trim();
  return /^\d+(\.\d{1,4})?$/.test(texto) && Number(texto) > 0;
};

/** ¿Es un monto válido (cero o más, hasta 2 decimales)? */
export const esMontoValido = (valor: string | number | null | undefined): boolean =>
  /^\d+(\.\d{1,2})?$/.test(String(valor ?? '').trim());
