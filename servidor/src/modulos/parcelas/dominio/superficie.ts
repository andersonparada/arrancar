import { SuperficieInvalida, UnidadSinVarasDeCuerda } from './errores-de-parcela.js';

/** Las unidades en que se escribe una superficie (`docs/modulos/diseno-parcelas.md` §3.3). */
export const UNIDADES_DE_SUPERFICIE = ['m2', 'hectarea', 'manzana', 'cuerda', 'vara_cuadrada', 'caballeria'] as const;
export type UnidadDeSuperficie = (typeof UNIDADES_DE_SUPERFICIE)[number];

/** Los factores de la configuración de la instalación; todas las unidades grandes parten de la vara cuadrada. */
export interface FactoresDeSuperficie {
  metrosPorVara: number;
  varasCuadradasPorManzana: number;
  varasCuadradasPorCaballeria: number;
}

/** Una unidad con las varas por lado de la cuerda que se usaron (solo la cuerda las lleva). */
export interface UnidadConCuerda {
  unidad: UnidadDeSuperficie;
  varasPorLadoDeCuerda: number | null;
}

/** Decimales con que se muestra cada unidad. */
const DECIMALES: Readonly<Record<UnidadDeSuperficie, number>> = {
  m2: 2,
  hectarea: 4,
  manzana: 4,
  cuerda: 2,
  vara_cuadrada: 2,
  caballeria: 4,
};

/** Lo más que cabe en `numeric(14,2)`, en centésimas de m². */
const MAXIMO_DE_CENTESIMAS = 10n ** 14n - 1n;
/** Las varas por lado que admite una cuerda. */
export const VARAS_MAXIMAS_DE_CUERDA = 100;

const ESCALA_DEL_FACTOR = 1_000_000n;
const DECIMALES_DE_LA_CANTIDAD = 4;

/** Un factor de la configuración como entero de millonésimas, sin arrastrar error de coma flotante. */
function enMillonesimas(factor: number): bigint {
  return BigInt(Math.round(factor * Number(ESCALA_DEL_FACTOR)));
}

/**
 * Cuántos m² tiene una unidad, como entero a escala 10^18 (millonésimas de los factores, dos veces la vara y una
 * más de los factores por unidad): así la conversión es exacta y solo se redondea al final.
 */
function metrosCuadradosPorUnidad(origen: UnidadConCuerda, factores: FactoresDeSuperficie): bigint {
  const vara = enMillonesimas(factores.metrosPorVara);
  const varaCuadrada = vara * vara * ESCALA_DEL_FACTOR;
  const variasVaras = (varas: number) => (varaCuadrada * enMillonesimas(varas)) / ESCALA_DEL_FACTOR;
  const porUnidad: Record<UnidadDeSuperficie, () => bigint> = {
    m2: () => 10n ** 18n,
    hectarea: () => 10n ** 22n,
    vara_cuadrada: () => varaCuadrada,
    manzana: () => variasVaras(factores.varasCuadradasPorManzana),
    caballeria: () => variasVaras(factores.varasCuadradasPorCaballeria),
    cuerda: () => varaCuadrada * BigInt(varasDeLaCuerda(origen)) ** 2n,
  };
  return porUnidad[origen.unidad]();
}

/** Las varas por lado de la cuerda, que la cuerda necesita y las demás unidades no llevan. */
function varasDeLaCuerda({ varasPorLadoDeCuerda }: UnidadConCuerda): number {
  if (varasPorLadoDeCuerda === null) throw new UnidadSinVarasDeCuerda();
  if (
    !Number.isInteger(varasPorLadoDeCuerda) ||
    varasPorLadoDeCuerda < 1 ||
    varasPorLadoDeCuerda > VARAS_MAXIMAS_DE_CUERDA
  ) {
    throw new SuperficieInvalida(`Las varas por lado de la cuerda van de 1 a ${VARAS_MAXIMAS_DE_CUERDA}.`);
  }
  return varasPorLadoDeCuerda;
}

/** Una cantidad escrita como texto (`"12.5"`) en diezmilésimas enteras; más de cuatro decimales no se admiten. */
function enDiezmilesimas(cantidad: string): bigint {
  const texto = cantidad.trim();
  if (!/^\d{1,12}(\.\d{1,4})?$/.test(texto)) {
    throw new SuperficieInvalida('Escriba la superficie como un número positivo con hasta cuatro decimales.');
  }
  const [enteros = '0', decimales = ''] = texto.split('.');
  return BigInt(enteros + decimales.padEnd(DECIMALES_DE_LA_CANTIDAD, '0'));
}

/** División entera con redondeo de la mitad hacia arriba (para valores no negativos). */
function dividirRedondeando(numerador: bigint, denominador: bigint): bigint {
  return (numerador * 2n + denominador) / (denominador * 2n);
}

/**
 * Convierte una cantidad en alguna unidad a centésimas de m² enteras (como los centavos del dinero).
 * @throws SuperficieInvalida si la cifra no es un número positivo con hasta cuatro decimales.
 * @throws UnidadSinVarasDeCuerda si la unidad es la cuerda y no se dan las varas por lado.
 */
export function aCentesimasDeM2(cantidad: string, origen: UnidadConCuerda, factores: FactoresDeSuperficie): number {
  const diezmilesimas = enDiezmilesimas(cantidad);
  if (diezmilesimas === 0n) throw new SuperficieInvalida('La superficie debe ser mayor que cero.');
  const centesimas = dividirRedondeando(diezmilesimas * metrosCuadradosPorUnidad(origen, factores), 10n ** 20n);
  if (centesimas === 0n) throw new SuperficieInvalida('La superficie es demasiado pequeña.');
  if (centesimas > MAXIMO_DE_CENTESIMAS) throw new SuperficieInvalida('La superficie es demasiado grande.');
  return Number(centesimas);
}

/** Cuántos decimales lleva cada unidad al mostrarse. */
export const decimalesDe = (unidad: UnidadDeSuperficie): number => DECIMALES[unidad];

/** Un entero a escala 10^decimales como texto con ese número de decimales: `45125564`, 2 → `"451255.64"`. */
function conDecimales(escalado: bigint, decimales: number): string {
  const digitos = escalado.toString().padStart(decimales + 1, '0');
  if (decimales === 0) return digitos;
  return `${digitos.slice(0, -decimales)}.${digitos.slice(-decimales)}`;
}

/** El destino de una conversión con un número de decimales propio. */
export interface DestinoConDecimales extends UnidadConCuerda {
  decimales: number;
}

/** Centésimas de m² en una unidad con los decimales que se pidan (el Excel lleva los cuatro que admite al importar). */
export function deCentesimasDeM2ConDecimales(
  centesimas: number,
  destino: DestinoConDecimales,
  factores: FactoresDeSuperficie,
): string {
  const porUnidad = metrosCuadradosPorUnidad(destino, factores);
  const escala = 10n ** BigInt(destino.decimales) * 10n ** 16n;
  return conDecimales(dividirRedondeando(BigInt(centesimas) * escala, porUnidad), destino.decimales);
}

/**
 * Convierte centésimas de m² a otra unidad, como texto con los decimales de esa unidad (para mostrar, nunca para
 * guardar).
 */
export function deCentesimasDeM2(centesimas: number, destino: UnidadConCuerda, factores: FactoresDeSuperficie): string {
  return deCentesimasDeM2ConDecimales(centesimas, { ...destino, decimales: decimalesDe(destino.unidad) }, factores);
}

/** Centésimas de m² como texto con dos decimales: `45125564` → `"451255.64"` (es lo que se guarda en `numeric(14,2)`). */
export function centesimasATexto(centesimas: number): string {
  return conDecimales(BigInt(centesimas), 2);
}

/** El texto con dos decimales de la base (`"451255.64"`) en centésimas enteras. */
export function textoACentesimas(texto: string): number {
  const [enteros = '0', decimales = ''] = texto.split('.');
  return Number(enteros) * 100 + Number(decimales.padEnd(2, '0').slice(0, 2));
}
