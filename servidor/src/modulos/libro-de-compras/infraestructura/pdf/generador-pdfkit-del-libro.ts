import PDFDocument from 'pdfkit';
import { Semaforo } from '../../../core/compartido/infraestructura/semaforo.js';
import type {
  DatosDelPdfDelLibro,
  GeneradorDePdfDelLibro,
} from '../../aplicacion/puertos/generador-de-pdf-del-libro.js';
import { periodoParaElPdf } from '../../../core/impresion/pdf/monto-del-pdf.js';
import { PincelDelPdf } from '../../../core/impresion/pdf/pincel-del-pdf.js';
import {
  MARGEN,
  TAMANO_DE_HOJA,
  dibujarPieDeHoja,
  dibujarSelloDeFolio,
  hojaConFolio,
  type HojaConFolio,
} from '../../../core/impresion/pdf/hoja-con-folio.js';
import { dibujarEncabezadoDeLaTabla, dibujarFilasDeLaHoja } from '../../../core/impresion/pdf/tabla-del-pdf.js';
import { textoParaElPdf } from '../../../core/impresion/pdf/texto-para-el-pdf.js';
import { columnasDeLaTabla } from './columnas-de-la-tabla.js';
import { dibujarHojaDeResumen } from './hoja-de-resumen.js';

const NOMBRE_DEL_LIBRO = 'Libro de compras y servicios recibidos';

function dibujarEncabezado(pincel: PincelDelPdf, datos: DatosDelPdfDelLibro, hoja: HojaConFolio): void {
  const { empresa, tipoDeLibro, periodo } = datos;
  pincel.texto(empresa.nombre, { x: MARGEN, y: 30, ancho: 600 }, { tamano: 11, negrita: true, maximo: 100 });
  pincel.texto(`NIT: ${empresa.nit ?? 'sin NIT'}`, { x: MARGEN, y: 46, ancho: 600 }, { tamano: 8, maximo: 40 });
  const nombre = tipoDeLibro === 'completo' ? NOMBRE_DEL_LIBRO : `${NOMBRE_DEL_LIBRO} (simplificado)`;
  pincel.texto(nombre, { x: MARGEN, y: 60, ancho: 600 }, { tamano: 10, negrita: true });
  pincel.texto(`Período: ${periodoParaElPdf(periodo)}`, { x: MARGEN, y: 74, ancho: 600 }, { tamano: 8 });
  dibujarSelloDeFolio(pincel, hoja);
}

function dibujarLibro(pincel: PincelDelPdf, datos: DatosDelPdfDelLibro): void {
  const { libro, primerFolio } = datos;
  const columnas = columnasDeLaTabla(datos.tipoDeLibro);
  for (let indice = 0; indice < libro.hojas; indice++) {
    const hoja = hojaConFolio(indice, libro.hojas, primerFolio);
    pincel.documento.addPage();
    dibujarEncabezado(pincel, datos, hoja);
    const pagina = libro.paginas[indice];
    if (pagina) {
      dibujarEncabezadoDeLaTabla(pincel, columnas);
      dibujarFilasDeLaHoja(pincel, columnas, pagina);
    } else dibujarHojaDeResumen(pincel, datos);
    dibujarPieDeHoja(pincel, hoja);
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
