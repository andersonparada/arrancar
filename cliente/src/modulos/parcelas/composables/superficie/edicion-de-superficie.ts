/**
 * Conversión de superficies, la misma del servidor (`dominio/superficie.ts`) para mostrar en vivo lo que el servidor va
 * a guardar. Todo se calcula con enteros grandes (sin coma flotante) y se redondea una sola vez, al final.
 */

export const UNIDADES_DE_SUPERFICIE = ['m2', 'hectarea', 'manzana', 'cuerda', 'vara_cuadrada', 'caballeria'] as const;
export type UnidadDeSuperficie = (typeof UNIDADES_DE_SUPERFICIE)[number];

/** Los factores que el servidor manda con la sesión; todas las unidades grandes parten de la vara cuadrada. */
export interface FactoresDeSuperficie {
  metrosPorVara: number;
  varasCuadradasPorManzana: number;
  varasCuadradasPorCaballeria: number;
}

/** Una unidad con las varas por lado de la cuerda (solo la cuerda las necesita). */
export interface UnidadConCuerda {
  unidad: UnidadDeSuperficie;
  varasPorLadoDeCuerda: number | null;
}

/** Lo que no deja convertir una cifra; el mensaje dice cómo corregirla. */
export class SuperficieNoConvertible extends Error {}

/** Decimales con que se muestra cada unidad (los mismos del servidor). */
const DECIMALES: Readonly<Record<UnidadDeSuperficie, number>> = {
  m2: 2,
  hectarea: 4,
  manzana: 4,
  cuerda: 2,
  vara_cuadrada: 2,
  caballeria: 4,
};

const MAXIMO_DE_CENTESIMAS = 10n ** 14n - 1n;
const VARAS_MAXIMAS_DE_CUERDA = 100;
const ESCALA_DEL_FACTOR = 1_000_000n;
const DECIMALES_DE_LA_CANTIDAD = 4;

const enMillonesimas = (factor: number): bigint => BigInt(Math.round(factor * Number(ESCALA_DEL_FACTOR)));

/** Las varas por lado de la cuerda: la cuerda las necesita y tienen que ser un entero de 1 a 100. */
function varasDeLaCuerda({ varasPorLadoDeCuerda }: UnidadConCuerda): number {
  if (varasPorLadoDeCuerda === null) {
    throw new SuperficieNoConvertible('Escriba cuántas varas mide el lado de la cuerda.');
  }
  const valida =
    Number.isInteger(varasPorLadoDeCuerda) &&
    varasPorLadoDeCuerda >= 1 &&
    varasPorLadoDeCuerda <= VARAS_MAXIMAS_DE_CUERDA;
  if (!valida) {
    throw new SuperficieNoConvertible(`Las varas por lado de la cuerda van de 1 a ${VARAS_MAXIMAS_DE_CUERDA}.`);
  }
  return varasPorLadoDeCuerda;
}

/** Cuántos m² tiene una unidad, como entero a escala 10^18 (así la conversión es exacta). */
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

/** Una cantidad escrita como texto en diezmilésimas enteras; más de cuatro decimales no se admiten. */
function enDiezmilesimas(cantidad: string): bigint {
  const texto = cantidad.trim();
  if (!/^\d{1,12}(\.\d{1,4})?$/.test(texto)) {
    throw new SuperficieNoConvertible('Escriba la superficie como un número positivo con hasta cuatro decimales.');
  }
  const [enteros = '0', decimales = ''] = texto.split('.');
  return BigInt(enteros + decimales.padEnd(DECIMALES_DE_LA_CANTIDAD, '0'));
}

/** División entera con redondeo de la mitad hacia arriba (para valores no negativos). */
const dividirRedondeando = (numerador: bigint, denominador: bigint): bigint =>
  (numerador * 2n + denominador) / (denominador * 2n);

/**
 * Convierte una cantidad en alguna unidad a centésimas de m² enteras.
 * @throws SuperficieNoConvertible si la cifra no es válida o la cuerda no trae sus varas por lado.
 */
export function aCentesimasDeM2(cantidad: string, origen: UnidadConCuerda, factores: FactoresDeSuperficie): number {
  const diezmilesimas = enDiezmilesimas(cantidad);
  if (diezmilesimas === 0n) throw new SuperficieNoConvertible('La superficie debe ser mayor que cero.');
  const centesimas = dividirRedondeando(diezmilesimas * metrosCuadradosPorUnidad(origen, factores), 10n ** 20n);
  if (centesimas === 0n) throw new SuperficieNoConvertible('La superficie es demasiado pequeña.');
  if (centesimas > MAXIMO_DE_CENTESIMAS) throw new SuperficieNoConvertible('La superficie es demasiado grande.');
  return Number(centesimas);
}

/** Cuántos decimales lleva cada unidad al mostrarse. */
export const decimalesDe = (unidad: UnidadDeSuperficie): number => DECIMALES[unidad];

/** Un entero a escala 10^decimales como texto con ese número de decimales: `45125564`, 2 → `"451255.64"`. */
function conDecimales(escalado: bigint, decimales: number): string {
  const digitos = escalado.toString().padStart(decimales + 1, '0');
  return decimales === 0 ? digitos : `${digitos.slice(0, -decimales)}.${digitos.slice(-decimales)}`;
}

/** Centésimas de m² en otra unidad, como texto con los decimales de esa unidad (para mostrar, nunca para guardar). */
export function deCentesimasDeM2(centesimas: number, destino: UnidadConCuerda, factores: FactoresDeSuperficie): string {
  const decimales = decimalesDe(destino.unidad);
  const escala = 10n ** BigInt(decimales) * 10n ** 16n;
  const porUnidad = metrosCuadradosPorUnidad(destino, factores);
  return conDecimales(dividirRedondeando(BigInt(centesimas) * escala, porUnidad), decimales);
}

/** El texto con dos decimales que manda el servidor (`"451255.64"`) en centésimas enteras. */
export function textoACentesimas(texto: string): number {
  const [enteros = '0', decimales = ''] = texto.split('.');
  return Number(enteros) * 100 + Number(decimales.padEnd(2, '0').slice(0, 2));
}

/** Centésimas de m² como texto con dos decimales. */
export const centesimasATexto = (centesimas: number): string => conDecimales(BigInt(centesimas), 2);
