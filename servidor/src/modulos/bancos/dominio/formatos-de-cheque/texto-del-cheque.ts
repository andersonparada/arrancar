import { BeneficiarioNoCabe, MontoEnLetrasNoCabe, MontoEnNumerosNoCabe } from '../errores-de-impresion.js';

const MM_POR_PUNTO = 25.4 / 72;
/** En una letra monoespaciada cada carácter mide 0.6 veces el tamaño. */
const ANCHO_DE_CARACTER = 0.6;
/** Hasta dónde baja la letra del beneficiario antes de rendirse: un nombre no se corta en un título de crédito. */
export const TAMANO_MINIMO_DEL_BENEFICIARIO = 7;
const PASO_DE_TAMANO = 0.5;

/** Cuántos caracteres caben en un renglón de ese ancho con esa letra. */
export function capacidadDeRenglon(anchoMm: number, tamanoPt: number): number {
  return Math.floor(anchoMm / (ANCHO_DE_CARACTER * tamanoPt * MM_POR_PUNTO) + 1e-9);
}

const asteriscos = (cantidad: number): string => '*'.repeat(Math.max(0, cantidad));

/** El texto pegado al margen izquierdo y asteriscos hasta llenar el renglón. */
export const conRellenoALaDerecha = (texto: string, capacidad: number): string =>
  texto + asteriscos(capacidad - texto.length);

/** `Q**1,120.00` desde centavos enteros, sin decimales de punto flotante. */
export function cifraDelMonto(centavos: number): string {
  const enteros = String(Math.floor(centavos / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${enteros}.${String(centavos % 100).padStart(2, '0')}`;
}

/**
 * `Q***1,120.00`: la Q al margen izquierdo, la cifra pegada al borde derecho y asteriscos en medio; siempre queda al
 * menos uno, para que no se pueda anteponer un dígito.
 * @throws MontoEnNumerosNoCabe si no cabe.
 */
export function montoEnNumerosRellenado(centavos: number, capacidad: number): string {
  const cifra = cifraDelMonto(centavos);
  if (cifra.length + 2 > capacidad) throw new MontoEnNumerosNoCabe();
  return `Q${asteriscos(capacidad - 1 - cifra.length)}${cifra}`;
}

/** El nombre con su relleno y la letra con que quedó: baja de tamaño hasta 7 pt; siempre queda al menos un asterisco. */
export interface BeneficiarioArmado {
  texto: string;
  tamanoPt: number;
}

/** @throws BeneficiarioNoCabe si ni con la letra más chica queda lugar para el nombre y un asterisco. */
export function beneficiarioArmado(nombre: string, campo: { anchoMm: number; tamanoPt: number }): BeneficiarioArmado {
  const limpio = nombre.trim();
  for (let tamanoPt = campo.tamanoPt; ; tamanoPt -= PASO_DE_TAMANO) {
    const capacidad = capacidadDeRenglon(campo.anchoMm, tamanoPt);
    if (limpio.length < capacidad) return { texto: conRellenoALaDerecha(limpio, capacidad), tamanoPt };
    if (tamanoPt - PASO_DE_TAMANO < TAMANO_MINIMO_DEL_BENEFICIARIO) throw new BeneficiarioNoCabe();
  }
}

/** Los dos renglones de las letras, ya rellenos (el segundo es `null` si el formato no lo tiene). */
export interface LetrasArmadas {
  primero: string;
  segundo: string | null;
}

interface CapacidadesDeLetras {
  primero: number;
  /** `null` si el formato no tiene segundo renglón. */
  segundo: number | null;
}

/** Las palabras que caben enteras en `capacidad` caracteres, y las que sobran. */
function partirEntrePalabras(texto: string, capacidad: number): { cabe: string; resto: string } {
  const palabras = texto.split(' ');
  let cabe = '';
  let usadas = 0;
  for (const palabra of palabras) {
    const candidata = cabe ? `${cabe} ${palabra}` : palabra;
    if (candidata.length > capacidad) break;
    cabe = candidata;
    usadas += 1;
  }
  return { cabe, resto: palabras.slice(usadas).join(' ') };
}

/**
 * El monto en letras en uno o dos renglones, pegado a la izquierda y partido solo entre palabras. El hueco al final del
 * primer renglón se llena con asteriscos y el segundo termina también con asteriscos; si el texto cabe en el primero y
 * hay segundo renglón, este se llena entero (que no se pueda escribir nada). Sin segundo renglón, el primero deja al
 * menos un asterisco.
 * @throws MontoEnLetrasNoCabe si no cabe en los renglones del formato.
 */
export function letrasArmadas(texto: string, { primero, segundo }: CapacidadesDeLetras): LetrasArmadas {
  if (segundo === null) {
    if (texto.length >= primero) throw new MontoEnLetrasNoCabe();
    return { primero: conRellenoALaDerecha(texto, primero), segundo: null };
  }
  const { cabe, resto } = partirEntrePalabras(texto, primero);
  if (!cabe) throw new MontoEnLetrasNoCabe();
  if (!resto) return { primero: conRellenoALaDerecha(cabe, primero), segundo: asteriscos(segundo) };
  if (resto.length >= segundo) throw new MontoEnLetrasNoCabe();
  return { primero: conRellenoALaDerecha(cabe, primero), segundo: conRellenoALaDerecha(resto, segundo) };
}
