const FORMATO = /^(\d{1,6})(?:\.(\d{1,20}))?(?:[eE]([-+]?\d{1,2}))?$/;
/** Largo máximo del texto aceptado. */
const LARGO_MAXIMO = 32;
/** Decimales con que se guardan los tipos de cambio (`numeric(16,8)`). */
export const ESCALA = 8;
/** Decimales con que se leen los valores publicados: el promedio de compra y venta suma uno a lo publicado. */
export const ESCALA_DE_LO_PUBLICADO = 9;
/** Cifras enteras que caben: el mayor valor de cualquier escala es 99999999.99… */
const CIFRAS_ENTERAS = 8;

/**
 * El texto decimal como entero escalado × 10^`escala`, sin pasar por `number`. Acepta notación científica y más
 * decimales de los que caben (se redondea desde la mitad hacia arriba). `undefined` si el formato no es válido o el
 * resultado pasa de 99999999.99… (con `escala` decimales).
 */
export function decimalEscalado(texto: string, escala: number): bigint | undefined {
  const partes = texto.length <= LARGO_MAXIMO ? FORMATO.exec(texto) : null;
  if (!partes) return undefined;
  const decimales = partes[2] ?? '';
  const mantisa = BigInt(partes[1]! + decimales);
  const desplazamiento = escala - decimales.length + Number(partes[3] ?? 0);
  const valor =
    desplazamiento >= 0 ? mantisa * 10n ** BigInt(desplazamiento) : dividirRedondeando(mantisa, -desplazamiento);
  return valor > 10n ** BigInt(CIFRAS_ENTERAS + escala) - 1n ? undefined : valor;
}

/** El texto decimal como entero escalado × 10⁸ (ver {@link decimalEscalado}). */
export function referenciaEscalada(texto: string): bigint | undefined {
  return decimalEscalado(texto, ESCALA);
}

function dividirRedondeando(numerador: bigint, potencia: number): bigint {
  const divisor = 10n ** BigInt(potencia);
  return (numerador + divisor / 2n) / divisor;
}

/** Entero escalado × 10^`escala` como texto decimal sin ceros sobrantes. */
export function textoDeDecimal(valor: bigint, escala: number): string {
  const completo = valor.toString().padStart(escala + 1, '0');
  const entera = completo.slice(0, -escala);
  const fraccion = completo.slice(-escala).replace(/0+$/, '');
  return fraccion ? `${entera}.${fraccion}` : entera;
}

/** El entero escalado × 10⁸ como texto decimal sin ceros sobrantes (`764489000` es `7.64489`). */
export function textoDeEscalado(valor: bigint): string {
  return textoDeDecimal(valor, ESCALA);
}
