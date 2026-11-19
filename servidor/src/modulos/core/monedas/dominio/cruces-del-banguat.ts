import type { ConvencionDePublicacion, MotivoDeRechazo } from './publicacion.js';
import { decimalEscalado, ESCALA, ESCALA_DE_LO_PUBLICADO, textoDeDecimal } from './valores-decimales.js';

/** Si `venta` y `compra` se separan más de este porcentaje de su promedio, el valor no se guarda (adenda B.5). */
export const DIFERENCIAL_MAXIMO_EN_PORCIENTO = 3;

/** Un cambio mayor de este porcentaje del valor publicado hace sospechar que la moneda llegó invertida (B.6). */
export const VARIACION_PARA_SOSPECHAR_INVERSION_EN_PORCIENTO = 5;

const UNIDAD = 10n ** BigInt(ESCALA_DE_LO_PUBLICADO);

/** Lo que resulta de revisar la compra y la venta publicadas de una moneda. */
export type RevisionDeCompraYVenta =
  | { readonly valida: true; readonly promedio: string; readonly compra: string; readonly venta: string }
  | { readonly valida: false; readonly motivo: Extract<MotivoDeRechazo, 'dato_invalido' | 'valor_ambiguo'> };

/**
 * El promedio de `compra` y `venta` tal como se publicaron (en su convención), exacto: a lo más un decimal más que lo
 * publicado. Es una política contable de la instalación, no un valor del Banguat. `undefined` si algún texto no es un
 * decimal válido.
 */
export function promedioPublicado(compra: string, venta: string): string | undefined {
  const a = decimalEscalado(compra, ESCALA);
  const b = decimalEscalado(venta, ESCALA);
  if (a === undefined || b === undefined) return undefined;
  return textoDeDecimal((a + b) * 5n, ESCALA_DE_LO_PUBLICADO);
}

/**
 * Revisa la compra y la venta: ambas decimales mayores que cero y `venta ≥ compra` (`dato_invalido`), y un diferencial
 * de hasta {@link DIFERENCIAL_MAXIMO_EN_PORCIENTO} % de su promedio (`valor_ambiguo`). Aritmética entera.
 */
export function revisarCompraYVenta(compra: string, venta: string): RevisionDeCompraYVenta {
  const a = decimalEscalado(compra, ESCALA);
  const b = decimalEscalado(venta, ESCALA);
  if (a === undefined || b === undefined || a === 0n || b < a) return { valida: false, motivo: 'dato_invalido' };
  if ((b - a) * 200n > BigInt(DIFERENCIAL_MAXIMO_EN_PORCIENTO) * (a + b))
    return { valida: false, motivo: 'valor_ambiguo' };
  const promedio = textoDeDecimal((a + b) * 5n, ESCALA_DE_LO_PUBLICADO);
  return { valida: true, promedio, compra: textoDeDecimal(a, ESCALA), venta: textoDeDecimal(b, ESCALA) };
}

/** Entrada de {@link normalizarAQuetzales}. */
export interface EntradaDeNormalizacion {
  readonly convencion: ConvencionDePublicacion;
  /** El promedio del cruce publicado (de {@link promedioPublicado}), en su convención. */
  readonly promedio: string;
  /** La referencia del dólar del Banguat de la misma fecha, en quetzales. */
  readonly dolar: string;
}

function dividirRedondeando(numerador: bigint, divisor: bigint): bigint {
  return (numerador * 2n + divisor) / (divisor * 2n);
}

/**
 * Pasa el promedio publicado a quetzales por una unidad (JM-126-2006, numeral 2): `dolar × promedio` si la convención
 * es `usd_por_unidad`, `dolar ÷ promedio` si es `unidades_por_usd`. Enteros, y un solo redondeo, desde la mitad, a 8
 * decimales. `undefined` si algún dato no es válido, el resultado queda en cero o no cabe.
 */
export function normalizarAQuetzales(entrada: EntradaDeNormalizacion): string | undefined {
  const p = decimalEscalado(entrada.promedio, ESCALA_DE_LO_PUBLICADO);
  const d = decimalEscalado(entrada.dolar, ESCALA);
  if (p === undefined || d === undefined || p === 0n) return undefined;
  const valor = quetzalesPorUnidad(entrada.convencion, p, d);
  return valor === 0n || valor >= 10n ** 16n ? undefined : textoDeDecimal(valor, ESCALA);
}

function quetzalesPorUnidad(convencion: ConvencionDePublicacion, p: bigint, d: bigint): bigint {
  if (convencion === 'usd_por_unidad') return dividirRedondeando(d * p, UNIDAD);
  if (convencion === 'unidades_por_usd') return dividirRedondeando(d * UNIDAD, p);
  return dividirRedondeando(p, 10n ** BigInt(ESCALA_DE_LO_PUBLICADO - ESCALA));
}

/**
 * Si `publicado` parece la moneda al revés de `anterior` (el euro como 0.8883 euros por dólar en vez de 1.1257 dólares
 * por euro): cambió más de {@link VARIACION_PARA_SOSPECHAR_INVERSION_EN_PORCIENTO} % **y** `publicado × anterior`
 * queda más cerca de 1 que `publicado ÷ anterior`. Los dos son valores publicados, en la misma convención. Un salto
 * real grande (el peso argentino de 800 a 1,500) no se confunde. `false` si algún dato no es válido.
 */
export function inversionProbable(publicado: string, anterior: string): boolean {
  const p = decimalEscalado(publicado, ESCALA_DE_LO_PUBLICADO);
  const a = decimalEscalado(anterior, ESCALA_DE_LO_PUBLICADO);
  if (p === undefined || a === undefined || p === 0n || a === 0n) return false;
  const cambio = p > a ? p - a : a - p;
  if (cambio * 100n <= BigInt(VARIACION_PARA_SOSPECHAR_INVERSION_EN_PORCIENTO) * a) return false;
  const productoMenosUno = p * a > UNIDAD * UNIDAD ? p * a - UNIDAD * UNIDAD : UNIDAD * UNIDAD - p * a;
  return productoMenosUno * a < cambio * UNIDAD * UNIDAD;
}
