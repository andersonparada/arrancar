import { fileURLToPath } from 'node:url';
import { textoParaElPdf } from './texto-para-el-pdf.js';

/** Las fuentes viajan en el repositorio (`servidor/recursos/fuentes`), tanto en `src` como en `dist`; nunca de la red. */
const rutaDeFuente = (archivo: string) =>
  fileURLToPath(new URL(`../../../../../recursos/fuentes/${archivo}`, import.meta.url));

const REGULAR = 'regular';
const NEGRITA = 'negrita';
const TAMANO_MINIMO = 5;
const SIN_GLIFO = '?';
const MAXIMO_POR_OMISION = 300;

interface FuenteConGlifos {
  hasGlyphForCodePoint(punto: number): boolean;
}

export interface Caja {
  x: number;
  y: number;
  ancho: number;
}

export interface Estilo {
  tamano: number;
  negrita?: boolean;
  alinear?: 'left' | 'right' | 'center';
  /** Cuántos caracteres admite el texto antes de recortarse con «…». */
  maximo?: number;
  /** Los números nunca se parten: si no caben, se achican. */
  numero?: boolean;
  color?: string;
}

/**
 * Lo único que escribe texto en el PDF: limpia lo que viene del usuario y cambia por «?» lo que la fuente no tiene.
 * Nada de lo que recibe se interpreta como enlace, imagen ni ruta.
 */
export class PincelDelComprobante {
  constructor(private readonly doc: PDFKit.PDFDocument) {
    doc.registerFont(REGULAR, rutaDeFuente('NotoSans-Regular.ttf'));
    doc.registerFont(NEGRITA, rutaDeFuente('NotoSans-Bold.ttf'));
  }

  /** Cuánto mide el texto al dibujarlo en `ancho` (con sus saltos de línea por ajuste). */
  alto(texto: string, ancho: number, estilo: Estilo): number {
    return this.doc.heightOfString(this.limpio(texto, estilo), { width: ancho });
  }

  /** Dibuja el texto ajustado a la caja y devuelve lo que ocupó. */
  texto(texto: string, caja: Caja, estilo: Estilo): number {
    const { tamano, alinear = 'left', numero = false, color = '#000000' } = estilo;
    const limpio = this.limpio(texto, estilo);
    const tamanoFinal = numero ? this.tamanoQueCabe(limpio, caja.ancho, tamano) : tamano;
    this.doc.font(estilo.negrita ? NEGRITA : REGULAR).fillColor(color);
    this.doc.fontSize(tamanoFinal).text(limpio, caja.x, caja.y, { width: caja.ancho, align: alinear });
    return this.doc.heightOfString(limpio, { width: caja.ancho });
  }

  linea(desde: { x: number; y: number }, ancho: number, grosor = 0.5): void {
    this.doc
      .lineWidth(grosor)
      .strokeColor('#000000')
      .moveTo(desde.x, desde.y)
      .lineTo(desde.x + ancho, desde.y)
      .stroke();
  }

  relleno(caja: Caja & { alto: number }, color: string): void {
    this.doc.rect(caja.x, caja.y, caja.ancho, caja.alto).fill(color);
  }

  recuadro(caja: Caja & { alto: number }, grosor = 1): void {
    this.doc.lineWidth(grosor).strokeColor('#000000').rect(caja.x, caja.y, caja.ancho, caja.alto).stroke();
  }

  private limpio(texto: string, estilo: Estilo): string {
    this.doc.font(estilo.negrita ? NEGRITA : REGULAR).fontSize(estilo.tamano);
    return this.conGlifos(textoParaElPdf(texto, estilo.maximo ?? MAXIMO_POR_OMISION));
  }

  private conGlifos(texto: string): string {
    const fuente = (this.doc as unknown as { _font: { font: FuenteConGlifos } })._font.font;
    return Array.from(texto, (c) => (fuente.hasGlyphForCodePoint(c.codePointAt(0) ?? 0) ? c : SIN_GLIFO)).join('');
  }

  private tamanoQueCabe(texto: string, ancho: number, tamano: number): number {
    this.doc.fontSize(tamano);
    const natural = this.doc.widthOfString(texto);
    return natural <= ancho ? tamano : Math.max(TAMANO_MINIMO, (tamano * ancho) / natural);
  }
}
