import { fileURLToPath } from 'node:url';
import { textoParaElPdf } from '../../dominio/libro/texto-para-el-pdf.js';

/** Las fuentes viajan en el repositorio (`servidor/recursos/fuentes`), tanto en `src` como en `dist`; nunca de la red. */
const rutaDeFuente = (archivo: string) =>
  fileURLToPath(new URL(`../../../../../recursos/fuentes/${archivo}`, import.meta.url));

const REGULAR = 'regular';
const NEGRITA = 'negrita';
const TAMANO_MINIMO = 4;
const SIN_GLIFO = '?';

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
  /** Los números nunca se recortan: si no caben, se achican. */
  numero?: boolean;
  color?: string;
}

/**
 * Lo único que escribe texto en el PDF: limpia lo que viene del usuario, cambia por «?» lo que la fuente no tiene y lo
 * ajusta a su columna en una línea. Nada de lo que recibe se interpreta como enlace, imagen ni ruta.
 */
export class PincelDelPdf {
  constructor(private readonly doc: PDFKit.PDFDocument) {
    doc.registerFont(REGULAR, rutaDeFuente('NotoSans-Regular.ttf'));
    doc.registerFont(NEGRITA, rutaDeFuente('NotoSans-Bold.ttf'));
  }

  get documento(): PDFKit.PDFDocument {
    return this.doc;
  }

  texto(texto: string, caja: Caja, estilo: Estilo): void {
    const { doc } = this;
    const { tamano, negrita = false, alinear = 'left', numero = false, color = '#000000' } = estilo;
    doc.font(negrita ? NEGRITA : REGULAR).fillColor(color);
    const limpio = this.conGlifos(textoParaElPdf(texto, estilo.maximo ?? 60));
    const [visible, tamanoFinal] = numero
      ? [limpio, this.tamanoQueCabe(limpio, caja.ancho, tamano)]
      : [this.recortadoAlAncho(limpio, caja.ancho, tamano), tamano];
    doc.fontSize(tamanoFinal).text(visible, caja.x, caja.y, { width: caja.ancho, align: alinear, lineBreak: false });
  }

  /** Un título fijo del programa (no del usuario) que puede ocupar varias líneas dentro de su columna. */
  titulo(texto: string, caja: Caja & { alto: number }, tamano: number): void {
    this.doc.font(NEGRITA).fillColor('#000000').fontSize(tamano);
    this.doc.text(texto, caja.x, caja.y, { width: caja.ancho, height: caja.alto, align: 'center', ellipsis: true });
  }

  linea(desde: { x: number; y: number }, ancho: number, grosor = 0.3): void {
    this.doc
      .lineWidth(grosor)
      .strokeColor('#555555')
      .moveTo(desde.x, desde.y)
      .lineTo(desde.x + ancho, desde.y)
      .stroke();
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

  private recortadoAlAncho(texto: string, ancho: number, tamano: number): string {
    this.doc.fontSize(tamano);
    if (this.doc.widthOfString(texto) <= ancho) return texto;
    const caracteres = Array.from(texto);
    const conPuntos = (cuantos: number) => `${caracteres.slice(0, cuantos).join('').trimEnd()}…`;
    let cabe = 0;
    let sobra = caracteres.length;
    while (cabe < sobra) {
      const medio = Math.ceil((cabe + sobra) / 2);
      if (this.doc.widthOfString(conPuntos(medio)) <= ancho) cabe = medio;
      else sobra = medio - 1;
    }
    return conPuntos(cabe);
  }
}
