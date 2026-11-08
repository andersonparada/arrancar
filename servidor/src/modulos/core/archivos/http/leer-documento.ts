import type { FastifyRequest } from 'fastify';
import { DatoInvalido } from '../../compartido/dominio/errores.js';
import { DocumentoDemasiadoGrande, LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO } from '../dominio/documento.js';

const MEGABYTE = 1024 * 1024;

export class FaltaElDocumento extends DatoInvalido {
  readonly codigo = 'falta_el_documento';

  constructor() {
    super('Adjunte el documento.');
  }
}

/** El documento subido y el nombre con que lo mandó el navegador (solo para mostrar). */
export interface DocumentoSubido {
  contenido: Buffer;
  nombre: string | null;
}

/**
 * Lee el documento (PDF o foto) de una petición `multipart/form-data` con el tope más alto de los documentos. Si la
 * subida pasa del tope, el flujo se corta: se rechaza en vez de revisar un archivo incompleto.
 * @throws FaltaElDocumento si no trae archivo.
 * @throws DocumentoDemasiadoGrande si se pasa del tope.
 */
export async function leerDocumentoDeSolicitud(solicitud: FastifyRequest): Promise<DocumentoSubido> {
  const parte = await solicitud.file({ limits: { fileSize: LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO } });
  if (!parte) throw new FaltaElDocumento();
  const demasiado = () => new DocumentoDemasiadoGrande(LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO / MEGABYTE);
  const contenido = await parte.toBuffer().catch((error: NodeJS.ErrnoException) => {
    throw error.code === 'FST_REQ_FILE_TOO_LARGE' ? demasiado() : error;
  });
  if (parte.file.truncated) throw demasiado();
  return { contenido, nombre: parte.filename || null };
}
