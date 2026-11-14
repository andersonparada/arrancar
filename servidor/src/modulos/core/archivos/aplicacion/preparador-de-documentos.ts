import { createHash } from 'node:crypto';
import {
  DocumentoDemasiadoGrande,
  DocumentoNoAceptado,
  esPdfPorFirma,
  LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO,
  LIMITE_DE_BYTES_DE_PDF,
} from '../dominio/documento.js';
import { FormatoDeImagenNoAceptado } from '../dominio/imagen.js';
import type { InspectorDePdf, TurnoDeRevision } from './puertos/inspector-de-pdf.js';
import type { OptimizadorDeImagenes } from './puertos/optimizador-de-imagenes.js';

/** Lo que se guardará: el contenido ya revisado y sus datos. */
export interface DocumentoPreparado {
  contenido: Buffer;
  tipoMime: string;
  extension: 'pdf' | 'webp';
  paginas: number | null;
  ancho: number | null;
  alto: number | null;
  /** Huella de lo que llegó, antes de reescribirlo. */
  sha256Recibido: string;
}

type Revisado = Omit<DocumentoPreparado, 'sha256Recibido'>;

const MEGABYTE = 1024 * 1024;
/** Las fotos de documentos se guardan más grandes y con más calidad que las demás para que se lean. */
const MEDIDAS_DE_FOTO = {
  original: { ladoMaximo: 2400, calidad: 85 },
  miniatura: { ladoMaximo: 400, calidad: 70 },
};

export const sha256 = (contenido: Buffer) => createHash('sha256').update(contenido).digest('hex');

/** Revisa lo recibido: los PDF pasan por el inspector y las fotos por el optimizador. No toca base ni disco. */
export class PreparadorDeDocumentos {
  constructor(
    private readonly inspector: InspectorDePdf,
    private readonly optimizador: OptimizadorDeImagenes,
  ) {}

  async preparar(recibido: Buffer, turno: TurnoDeRevision): Promise<DocumentoPreparado> {
    const revisado = esPdfPorFirma(recibido)
      ? await this.prepararPdf(recibido, turno)
      : await this.prepararFoto(recibido);
    return { ...revisado, sha256Recibido: sha256(recibido) };
  }

  private async prepararPdf(contenido: Buffer, turno: TurnoDeRevision): Promise<Revisado> {
    if (contenido.length > LIMITE_DE_BYTES_DE_PDF)
      throw new DocumentoDemasiadoGrande(LIMITE_DE_BYTES_DE_PDF / MEGABYTE);
    const { contenido: limpio, paginas } = await this.inspector.inspeccionar(contenido, turno);
    return { contenido: limpio, tipoMime: 'application/pdf', extension: 'pdf', paginas, ancho: null, alto: null };
  }

  private async prepararFoto(contenido: Buffer): Promise<Revisado> {
    const limite = LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO;
    if (contenido.length > limite) throw new DocumentoDemasiadoGrande(limite / MEGABYTE);
    try {
      const { original } = await this.optimizador.optimizar(contenido, MEDIDAS_DE_FOTO);
      const { ancho, alto } = original;
      return { contenido: original.contenido, tipoMime: 'image/webp', extension: 'webp', paginas: null, ancho, alto };
    } catch (error) {
      throw error instanceof FormatoDeImagenNoAceptado ? new DocumentoNoAceptado() : error;
    }
  }
}
