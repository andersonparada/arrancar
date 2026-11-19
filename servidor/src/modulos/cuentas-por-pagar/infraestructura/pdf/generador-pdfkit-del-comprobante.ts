import PDFDocument from 'pdfkit';
import { Semaforo } from '../../../core/compartido/infraestructura/semaforo.js';
import type { ComprobanteDePagoDto } from '../../aplicacion/dto/comprobante-de-pago.dto.js';
import type { GeneradorDePdfDelComprobante } from '../../aplicacion/puertos/generador-de-pdf-del-comprobante.js';
import { contenidoDelComprobante, type ContenidoDelComprobante } from './contenido-del-comprobante.js';
import { HojaDelComprobante, TAMANO_DE_HOJA } from './hoja-del-comprobante.js';
import { PincelDelComprobante } from './pincel-del-comprobante.js';
import { textoParaElPdf } from './texto-para-el-pdf.js';

function documentoNuevo(contenido: ContenidoDelComprobante): PDFKit.PDFDocument {
  return new PDFDocument({
    size: TAMANO_DE_HOJA,
    margins: { top: 0, left: 0, bottom: 0, right: 0 },
    autoFirstPage: false,
    info: {
      Title: textoParaElPdf(contenido.titulo, 120),
      Author: textoParaElPdf(contenido.empresa.principal, 100),
      Subject: 'Comprobante de pago (no es un documento tributario)',
      Creator: 'Arrancar',
      Producer: 'Arrancar',
    },
  });
}

function dibujar(doc: PDFKit.PDFDocument, contenido: ContenidoDelComprobante): void {
  const pincel = new PincelDelComprobante(doc);
  for (const rotulo of contenido.hojas) new HojaDelComprobante({ doc, pincel, contenido, rotulo }).dibujar();
}

/**
 * El comprobante de pago en PDF con pdfkit y la fuente Noto Sans del repositorio, para adjuntarlo al aviso de pago.
 * Se dibuja de una vez en memoria y de a una generación por vez (mientras dibuja bloquea el proceso). No lleva enlaces,
 * imágenes ni archivos incrustados.
 */
export class GeneradorPdfkitDelComprobante implements GeneradorDePdfDelComprobante {
  private readonly turno = new Semaforo(1);

  generar(comprobante: ComprobanteDePagoDto): Promise<Buffer> {
    const contenido = contenidoDelComprobante(comprobante);
    return this.turno.ejecutar(() => this.escribir(contenido));
  }

  private escribir(contenido: ContenidoDelComprobante): Promise<Buffer> {
    const doc = documentoNuevo(contenido);
    const trozos: Buffer[] = [];
    return new Promise<Buffer>((resolver, rechazar) => {
      doc.on('data', (trozo: Buffer) => trozos.push(trozo));
      doc.on('end', () => resolver(Buffer.concat(trozos)));
      doc.on('error', rechazar);
      try {
        dibujar(doc, contenido);
        doc.end();
      } catch (error) {
        rechazar(error);
      }
    });
  }
}
