const FORMATO = /^(\d{1,6})(?:\.(\d{1,20}))?(?:[eE]([-+]?\d{1,2}))?$/;
/** Largo máximo del texto aceptado. */
const LARGO_MAXIMO = 32;
/** Decimales con que se guardan los tipos de cambio (`numeric(16,8)`). */
export const ESCALA = 8;
/** El mayor valor que cabe: 99999999.99999999. */
const MAXIMO_ESCALADO = 10n ** 16n - 1n;

/**
 * El texto decimal como entero escalado × 10⁸, sin pasar por `number`. Acepta notación científica y más
 * de 8 decimales (se redondea desde la mitad hacia arriba). `undefined` si el formato no es válido o el
 * resultado pasa de 99999999.99999999.
 */
export function referenciaEscalada(texto: string): bigint | undefined {
  const partes = texto.length <= LARGO_MAXIMO ? FORMATO.exec(texto) : null;
  if (!partes) return undefined;
  const decimales = partes[2] ?? '';
  const mantisa = BigInt(partes[1]! + decimales);
  const desplazamiento = ESCALA - decimales.length + Number(partes[3] ?? 0);
  const valor =
    desplazamiento >= 0 ? mantisa * 10n ** BigInt(desplazamiento) : dividirRedondeando(mantisa, -desplazamiento);
  return valor > MAXIMO_ESCALADO ? undefined : valor;
}

function dividirRedondeando(numerador: bigint, potencia: number): bigint {
  const divisor = 10n ** BigInt(potencia);
  return (numerador + divisor / 2n) / divisor;
}

/** El entero escalado × 10⁸ como texto decimal sin ceros sobrantes (`764489000` es `7.64489`). */
export function textoDeEscalado(valor: bigint): string {
  const completo = valor.toString().padStart(ESCALA + 1, '0');
  const entera = completo.slice(0, -ESCALA);
  const fraccion = completo.slice(-ESCALA).replace(/0+$/, '');
  return fraccion ? `${entera}.${fraccion}` : entera;
}
