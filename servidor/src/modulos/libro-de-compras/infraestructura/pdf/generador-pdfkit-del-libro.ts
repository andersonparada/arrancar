import PDFDocument from 'pdfkit';
import { Semaforo } from '../../../core/compartido/infraestructura/semaforo.js';
import type {
  DatosDelPdfDelLibro,
  GeneradorDePdfDelLibro,
} from '../../aplicacion/puertos/generador-de-pdf-del-libro.js';
import { textoParaElPdf } from '../../dominio/libro/texto-para-el-pdf.js';
import { dibujarHojaDeResumen } from './hoja-de-resumen.js';
import { periodoParaElPdf } from './monto-del-pdf.js';
import { PincelDelPdf } from './pincel-del-pdf.js';
import {
  ANCHO_UTIL,
  MARGEN,
  columnasDeLaTabla,
  dibujarEncabezadoDeLaTabla,
  dibujarFilasDeLaHoja,
} from './tabla-del-pdf.js';

/** Oficio horizontal, en puntos. */
const TAMANO_DE_HOJA: [number, number] = [936, 612];
const NOMBRE_DEL_LIBRO = 'Libro de compras y servicios recibidos';

interface Hoja {
  numero: number;
  total: number;
  folio: number | null;
}

function dibujarEncabezado(pincel: PincelDelPdf, datos: DatosDelPdfDelLibro, hoja: Hoja): void {
  const { empresa, tipoDeLibro, periodo } = datos;
  pincel.texto(empresa.nombre, { x: MARGEN, y: 30, ancho: 600 }, { tamano: 11, negrita: true, maximo: 100 });
  pincel.texto(`NIT: ${empresa.nit ?? 'sin NIT'}`, { x: MARGEN, y: 46, ancho: 600 }, { tamano: 8, maximo: 40 });
  const nombre = tipoDeLibro === 'completo' ? NOMBRE_DEL_LIBRO : `${NOMBRE_DEL_LIBRO} (simplificado)`;
  pincel.texto(nombre, { x: MARGEN, y: 60, ancho: 600 }, { tamano: 10, negrita: true });
  pincel.texto(`Período: ${periodoParaElPdf(periodo)}`, { x: MARGEN, y: 74, ancho: 600 }, { tamano: 8 });
  const folio = hoja.folio === null ? 'BORRADOR — sin folio' : `Folio ${hoja.folio}`;
  const color = hoja.folio === null ? '#B00020' : '#000000';
  pincel.texto(
    folio,
    { x: MARGEN + ANCHO_UTIL - 250, y: 30, ancho: 250 },
    { tamano: 13, negrita: true, alinear: 'right', color },
  );
}

function dibujarPie(pincel: PincelDelPdf, hoja: Hoja): void {
  const texto = `Hoja ${hoja.numero} de ${hoja.total} de este libro`;
  pincel.texto(texto, { x: MARGEN, y: 584, ancho: ANCHO_UTIL }, { tamano: 7, alinear: 'center', color: '#444444' });
}

function dibujarLibro(pincel: PincelDelPdf, datos: DatosDelPdfDelLibro): void {
  const { libro, primerFolio } = datos;
  const columnas = columnasDeLaTabla(datos.tipoDeLibro);
  for (let indice = 0; indice < libro.hojas; indice++) {
    const hoja = { numero: indice + 1, total: libro.hojas, folio: primerFolio === null ? null : primerFolio + indice };
    pincel.documento.addPage();
    dibujarEncabezado(pincel, datos, hoja);
    const pagina = libro.paginas[indice];
    if (pagina) {
      dibujarEncabezadoDeLaTabla(pincel, columnas);
      dibujarFilasDeLaHoja(pincel, datos.tipoDeLibro, pagina);
    } else dibujarHojaDeResumen(pincel, datos);
    dibujarPie(pincel, hoja);
  }
}

function documentoNuevo(datos: DatosDelPdfDelLibro): PDFKit.PDFDocument {
  return new PDFDocument({
    size: TAMANO_DE_HOJA,
    margins: { top: 0, left: 0, bottom: 0, right: 0 },
    autoFirstPage: false,
    info: {
      Title: `Libro de compras ${datos.periodo.slice(0, 7)}`,
      Author: textoParaElPdf(datos.empresa.nombre, 100),
      Subject: NOMBRE_DEL_LIBRO,
      Creator: 'Arrancar',
      Producer: 'Arrancar',
    },
  });
}

/**
 * El PDF del libro con pdfkit y la fuente Noto Sans del repositorio. Se dibuja de una vez en memoria y de a una
 * generación por vez: mientras dibuja bloquea el proceso, así que las demás esperan su turno.
 */
export class GeneradorPdfkitDelLibro implements GeneradorDePdfDelLibro {
  private readonly turno = new Semaforo(1);

  generar(datos: DatosDelPdfDelLibro): Promise<Buffer> {
    return this.turno.ejecutar(() => this.dibujar(datos));
  }

  private dibujar(datos: DatosDelPdfDelLibro): Promise<Buffer> {
    const doc = documentoNuevo(datos);
    const trozos: Buffer[] = [];
    return new Promise<Buffer>((resolver, rechazar) => {
      doc.on('data', (trozo: Buffer) => trozos.push(trozo));
      doc.on('end', () => resolver(Buffer.concat(trozos)));
      doc.on('error', rechazar);
      try {
        dibujarLibro(new PincelDelPdf(doc), datos);
        doc.end();
      } catch (error) {
        rechazar(error);
      }
    });
  }
}
