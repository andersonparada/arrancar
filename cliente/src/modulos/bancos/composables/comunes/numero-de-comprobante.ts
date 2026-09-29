/** Lo que el servidor manda del número de un comprobante: `numero` es `null` si no lleva. */
export interface NumeroDeComprobante {
  numero: number | null;
  anioDeNumero: number;
}

/**
 * El número tal como se lee en pantalla e impresión: `2026-15` si la empresa reinicia por año (el año
 * primero, para que ordene y no se confunda con el mes) y `15` si no; `null` si el comprobante no lleva.
 */
export function formatearNumeroDeComprobante({ numero, anioDeNumero }: NumeroDeComprobante): string | null {
  if (numero === null) return null;
  return anioDeNumero > 0 ? `${anioDeNumero}-${numero}` : String(numero);
}
