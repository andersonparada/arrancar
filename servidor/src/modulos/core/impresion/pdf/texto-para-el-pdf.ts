/** Lo más largo que sale un nombre en el PDF; el dato completo queda en la base, la pantalla y el Excel. */
export const LARGO_MAXIMO_DEL_NOMBRE = 60;

/**
 * Lo que no se dibuja: controles C0 y C1 (menos tabulador y saltos, que se vuelven espacio), ceros de ancho y marcas
 * de dirección (U+202E y compañía), separadores de línea y párrafo, y el BOM.
 */
const RANGOS_INVISIBLES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x0008],
  [0x000b, 0x000c],
  [0x000e, 0x001f],
  [0x007f, 0x009f],
  [0x061c, 0x061c],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];

const comoClase = (rangos: typeof RANGOS_INVISIBLES) =>
  rangos
    .map(([desde, hasta]) => `${String.fromCodePoint(desde)}-${String.fromCodePoint(hasta)}`)
    .join('')
    .replace(/[\\\]^]/g, '\\$&');

const INVISIBLES_Y_DE_DIRECCION = new RegExp(`[${comoClase(RANGOS_INVISIBLES)}]`, 'gu');
const ESPACIOS = /[\t\n\r]+/g;
/** Antes de procesar se descarta lo que sobra: el costo no depende del largo que mande el usuario. */
const HOLGURA_DE_LECTURA = 4;

/**
 * Deja un texto del usuario listo para dibujarlo en el PDF: NFC, sin controles ni marcas de dirección, y recortado a
 * `maximo` caracteres con «…». Nunca falla ni tarda más por un texto enorme.
 */
export function textoParaElPdf(texto: string, maximo: number): string {
  const acotado = texto.slice(0, maximo * HOLGURA_DE_LECTURA + HOLGURA_DE_LECTURA);
  const limpio = acotado.normalize('NFC').replace(ESPACIOS, ' ').replace(INVISIBLES_Y_DE_DIRECCION, '').trim();
  const caracteres = Array.from(limpio);
  if (caracteres.length <= maximo) return limpio;
  return `${caracteres
    .slice(0, maximo - 1)
    .join('')
    .trimEnd()}…`;
}
