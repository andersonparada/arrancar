type Rgb = [number, number, number];

const TEXTO_CLARO = '#ffffff';
const TEXTO_OSCURO = '#1c1a16';

function hexARgb(hex: string): Rgb {
  const valor = Number.parseInt(hex.slice(1), 16);
  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255];
}

function rgbAHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Luminancia relativa según WCAG 2. */
function luminancia(hex: string): number {
  const [r, g, b] = hexARgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG entre dos colores (de 1 a 21). */
export function contraste(a: string, b: string): number {
  const [mayor, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (mayor + 0.05) / (menor + 0.05);
}

/** Texto blanco o casi negro, el que se lea mejor sobre `fondo`. */
export function textoLegibleSobre(fondo: string): string {
  return contraste(fondo, TEXTO_CLARO) >= contraste(fondo, TEXTO_OSCURO) ? TEXTO_CLARO : TEXTO_OSCURO;
}

/**
 * Variables CSS del tema a partir del color principal y el de acento.
 * Los tonos derivados se calculan con `color-mix` para que siempre combinen.
 */
export function variablesTema(principal: string, acento: string): Record<string, string> {
  const texto = textoLegibleSobre(principal);
  return {
    '--color-marca': principal,
    '--color-marca-oscuro': `color-mix(in oklab, ${principal} 78%, black)`,
    '--color-marca-texto': texto,
    '--color-acento': acento,
    '--color-acento-texto': textoLegibleSobre(acento),
  };
}

function rgbAHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const luz = (max + min) / 2;
  if (max === min) return [0, 0, luz];
  const d = max - min;
  const saturacion = luz > 0.5 ? d / (2 - max - min) : d / (max + min);
  const tono =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
      : max === gn
        ? ((bn - rn) / d + 2) * 60
        : ((rn - gn) / d + 4) * 60;
  return [tono, saturacion, luz];
}

function distanciaTono(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const LADO_DE_MUESTRA = 64;
const OPACIDAD_MINIMA = 200;
const TONO_DISTINTO = 40;

/** Los píxeles del logo reducido a un cuadrado pequeño (RGBA seguidos), o nada si no se puede dibujar. */
async function pixelesDeImagen(url: string): Promise<Uint8ClampedArray | null> {
  const imagen = new Image();
  imagen.crossOrigin = 'anonymous';
  imagen.src = url;
  await imagen.decode();
  const lienzo = Object.assign(document.createElement('canvas'), { width: LADO_DE_MUESTRA, height: LADO_DE_MUESTRA });
  const contexto = lienzo.getContext('2d', { willReadFrequently: true });
  if (!contexto) return null;
  contexto.drawImage(imagen, 0, 0, LADO_DE_MUESTRA, LADO_DE_MUESTRA);
  return contexto.getImageData(0, 0, LADO_DE_MUESTRA, LADO_DE_MUESTRA).data;
}

/** Transparentes, blancos, negros y grises no cuentan como color del logo. */
function tieneColor(rgb: Rgb, opacidad: number): boolean {
  const [, saturacion, luz] = rgbAHsl(rgb);
  return opacidad >= OPACIDAD_MINIMA && saturacion >= 0.2 && luz >= 0.08 && luz <= 0.92;
}

/** Agrupa los píxeles parecidos y devuelve el color medio de cada grupo, del más frecuente al menos. */
function coloresFrecuentes(pixeles: Uint8ClampedArray): Rgb[] {
  const grupos = new Map<string, { suma: Rgb; cantidad: number }>();
  for (let i = 0; i < pixeles.length; i += 4) {
    const rgb: Rgb = [pixeles[i]!, pixeles[i + 1]!, pixeles[i + 2]!];
    if (!tieneColor(rgb, pixeles[i + 3]!)) continue;
    const llave = rgb.map((c) => c >> 5).join('-');
    const grupo = grupos.get(llave) ?? { suma: [0, 0, 0], cantidad: 0 };
    grupos.set(llave, { suma: grupo.suma.map((c, j) => c + rgb[j]!) as Rgb, cantidad: grupo.cantidad + 1 });
  }
  return [...grupos.values()]
    .sort((a, b) => b.cantidad - a.cantidad)
    .map((grupo) => grupo.suma.map((c) => c / grupo.cantidad) as Rgb);
}

/** El más frecuente de otro tono; si no hay, el segundo más frecuente. */
function acentoPara(principal: Rgb, colores: Rgb[]): Rgb {
  const tonoPrincipal = rgbAHsl(principal)[0];
  const deOtroTono = colores.find((c) => distanciaTono(rgbAHsl(c)[0], tonoPrincipal) > TONO_DISTINTO);
  return deOtroTono ?? colores[1] ?? principal;
}

/**
 * Sugiere un color principal y uno de acento a partir de un logo: el color más
 * frecuente es el principal y el más frecuente de otro tono, el acento.
 */
export async function sugerirColoresDeImagen(url: string): Promise<{ principal: string; acento: string } | null> {
  const pixeles = await pixelesDeImagen(url);
  const colores = pixeles ? coloresFrecuentes(pixeles) : [];
  const principal = colores[0];
  if (!principal) return null;
  return { principal: rgbAHex(principal), acento: rgbAHex(acentoPara(principal, colores)) };
}
