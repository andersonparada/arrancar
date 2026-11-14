import type { FastifyRequest } from 'fastify';
import { CargaDemasiadoGrande, DatoInvalido } from '../../compartido/dominio/errores.js';
import {
  leerUnSoloArchivo,
  SubidaConMasDeUnArchivo,
  SubidaInterrumpida,
  traducirErrorDeMultipart,
} from '../../compartido/http/lectura-de-multipart.js';
import { LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO, LIMITE_DE_BYTES_DE_PDF } from '../dominio/documento.js';

export { SubidaConMasDeUnArchivo, SubidaInterrumpida };

const MEGABYTE = 1024 * 1024;

export class FaltaElDocumento extends DatoInvalido {
  readonly codigo = 'falta_el_documento';

  constructor() {
    super('Adjunte el documento.');
  }
}

/** La subida se cortó en el tope más alto; como aún no se sabe si era PDF o foto, el mensaje dice los dos límites. */
export class SubidaDemasiadoGrande extends CargaDemasiadoGrande {
  readonly codigo = 'documento_demasiado_grande';

  constructor() {
    const pdf = LIMITE_DE_BYTES_DE_PDF / MEGABYTE;
    const foto = LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO / MEGABYTE;
    super(`El archivo pesa demasiado (máximo ${pdf} MB para PDF y ${foto} MB para fotos).`);
  }
}

/** El documento subido y el nombre con que lo mandó el navegador (solo para mostrar). */
export interface DocumentoSubido {
  contenido: Buffer;
  nombre: string | null;
}

/** Convierte el error de tamaño en el propio de los documentos y deja el resto al traductor común del multipart. */
function traducir(error: unknown): unknown {
  if ((error as NodeJS.ErrnoException).code === 'FST_REQ_FILE_TOO_LARGE') return new SubidaDemasiadoGrande();
  return traducirErrorDeMultipart(error);
}

/**
 * Lee el documento (PDF o foto) de una petición `multipart/form-data` con el tope más alto de los documentos. Si la
 * subida pasa del tope, el flujo se corta: se rechaza en vez de revisar un archivo incompleto.
 * @throws FaltaElDocumento si no trae archivo.
 * Solo acepta una parte, el campo `archivo`, sin campos de texto.
 * @throws SubidaDemasiadoGrande, SubidaConMasDeUnArchivo o SubidaInterrumpida si la subida no llegó completa o bien.
 */
export async function leerDocumentoDeSolicitud(solicitud: FastifyRequest): Promise<DocumentoSubido> {
  try {
    const archivo = await leerUnSoloArchivo(solicitud, LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO);
    if (!archivo) throw new FaltaElDocumento();
    if (archivo.campo !== 'archivo') throw new SubidaConMasDeUnArchivo();
    if (archivo.truncado) throw new SubidaDemasiadoGrande();
    return { contenido: archivo.contenido, nombre: archivo.nombre || null };
  } catch (error) {
    throw traducir(error);
  }
}
