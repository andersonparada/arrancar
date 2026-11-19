import type { ContenidoDelComprobante } from './contenido-del-comprobante.js';
import type { PincelDelComprobante } from './pincel-del-comprobante.js';
import { ANCHO_UTIL, MARGEN, dibujarTabla, type Cursor } from './tabla-del-comprobante.js';

/** Carta, en puntos. */
export const TAMANO_DE_HOJA: [number, number] = [612, 792];
const LIMITE_INFERIOR = 752;
const ANCHO_DEL_ROTULO = 110;
const MITAD = (ANCHO_UTIL - 24) / 2;

export interface DependenciasDeLaHoja {
  doc: PDFKit.PDFDocument;
  pincel: PincelDelComprobante;
  contenido: ContenidoDelComprobante;
  /** «Original» o «Copia». */
  rotulo: string;
}

/**
 * Una hoja del comprobante (el original o la copia): encabezado, datos, tablas por contraseña, totales, leyendas y
 * firmas. Si el contenido no cabe, sigue en otra página con el encabezado repetido.
 */
export class HojaDelComprobante implements Cursor {
  y = 0;

  private readonly doc: PDFKit.PDFDocument;
  private readonly pincel: PincelDelComprobante;
  private readonly contenido: ContenidoDelComprobante;
  private readonly rotulo: string;

  constructor({ doc, pincel, contenido, rotulo }: DependenciasDeLaHoja) {
    this.doc = doc;
    this.pincel = pincel;
    this.contenido = contenido;
    this.rotulo = rotulo;
  }

  dibujar(): void {
    this.paginaNueva();
    this.anulacion();
    this.titulo();
    this.datos();
    for (const tabla of this.contenido.tablas) dibujarTabla(this.pincel, this, tabla);
    this.totalesYLeyendas();
    this.firmas();
  }

  asegurar(alto: number): void {
    if (this.y + alto > LIMITE_INFERIOR) this.paginaNueva();
  }

  private paginaNueva(): void {
    this.doc.addPage();
    const { empresa } = this.contenido;
    const ancho = ANCHO_UTIL - ANCHO_DEL_ROTULO - 10;
    let y = MARGEN;
    y += this.pincel.texto(empresa.principal, { x: MARGEN, y, ancho }, { tamano: 13, negrita: true, maximo: 120 });
    if (empresa.comercial) y += this.pincel.texto(empresa.comercial, { x: MARGEN, y, ancho }, { tamano: 9 });
    if (empresa.nit) y += this.pincel.texto(`NIT ${empresa.nit}`, { x: MARGEN, y, ancho }, { tamano: 9 });
    const caja = { x: MARGEN + ANCHO_UTIL - ANCHO_DEL_ROTULO, y: MARGEN, ancho: ANCHO_DEL_ROTULO, alto: 22 };
    this.pincel.recuadro(caja, 1.5);
    this.pincel.texto(
      this.rotulo.toUpperCase(),
      { ...caja, y: caja.y + 6 },
      { tamano: 10, negrita: true, alinear: 'center' },
    );
    this.pincel.linea({ x: MARGEN, y: y + 6 }, ANCHO_UTIL, 1.5);
    this.y = y + 16;
  }

  private anulacion(): void {
    if (!this.contenido.anulado) return;
    this.pincel.recuadro({ x: MARGEN, y: this.y, ancho: ANCHO_UTIL, alto: 26 }, 2);
    this.pincel.texto(
      this.contenido.anulado,
      { x: MARGEN + 6, y: this.y + 7, ancho: ANCHO_UTIL - 12 },
      { tamano: 11, negrita: true, alinear: 'center', maximo: 160 },
    );
    this.y += 36;
  }

  private titulo(): void {
    this.y += this.pincel.texto(
      this.contenido.titulo,
      { x: MARGEN, y: this.y, ancho: ANCHO_UTIL },
      { tamano: 14, negrita: true },
    );
    this.y += 8;
  }

  private datos(): void {
    for (const { rotulo, valor } of this.contenido.datos) {
      this.asegurar(14);
      this.pincel.texto(`${rotulo}:`, { x: MARGEN, y: this.y, ancho: 100 }, { tamano: 9, negrita: true, maximo: 40 });
      this.y += Math.max(
        12,
        this.pincel.texto(valor, { x: MARGEN + 105, y: this.y, ancho: ANCHO_UTIL - 105 }, { tamano: 9, maximo: 250 }) +
          2,
      );
    }
    if (this.contenido.posfechado) this.linea(this.contenido.posfechado, { tamano: 10, negrita: true });
    this.y += 8;
  }

  private totalesYLeyendas(): void {
    const [pagado, letras, cubre] = this.contenido.totales;
    this.linea(pagado ?? '', { tamano: 13, negrita: true });
    this.linea(letras ?? '', { tamano: 9 });
    this.linea(cubre ?? '', { tamano: 9 });
    this.y += 4;
    for (const leyenda of this.contenido.leyendas) this.linea(leyenda, { tamano: 9 });
  }

  private firmas(): void {
    this.asegurar(70);
    this.y += 40;
    this.contenido.firmas.forEach(({ rotulo, nombre }, indice) => {
      const x = MARGEN + indice * (MITAD + 24);
      this.pincel.linea({ x, y: this.y }, MITAD);
      const alto = this.pincel.texto(rotulo, { x, y: this.y + 3, ancho: MITAD }, { tamano: 8, maximo: 120 });
      if (nombre) this.pincel.texto(nombre, { x, y: this.y + 5 + alto, ancho: MITAD }, { tamano: 8, maximo: 120 });
    });
  }

  private linea(texto: string, estilo: { tamano: number; negrita?: boolean }): void {
    this.asegurar(estilo.tamano + 6);
    this.y += this.pincel.texto(texto, { x: MARGEN, y: this.y, ancho: ANCHO_UTIL }, estilo) + 3;
  }
}
