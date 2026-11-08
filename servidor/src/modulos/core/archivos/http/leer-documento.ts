import type { FastifyRequest } from 'fastify';
import { CargaDemasiadoGrande, DatoInvalido } from '../../compartido/dominio/errores.js';
import { LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO, LIMITE_DE_BYTES_DE_PDF } from '../dominio/documento.js';

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

export class SubidaConMasDeUnArchivo extends DatoInvalido {
  readonly codigo = 'subida_con_mas_de_un_archivo';

  constructor() {
    super('Envíe un solo archivo.');
  }
}

export class SubidaInterrumpida extends DatoInvalido {
  readonly codigo = 'subida_interrumpida';

  constructor() {
    super('La subida se interrumpió antes de terminar. Intente de nuevo.');
  }
}

/** El documento subido y el nombre con que lo mandó el navegador (solo para mostrar). */
export interface DocumentoSubido {
  contenido: Buffer;
  nombre: string | null;
}

const CODIGOS_DE_DEMASIADAS_PARTES = ['FST_FILES_LIMIT', 'FST_PARTS_LIMIT', 'FST_FIELDS_LIMIT'];
const CODIGOS_DE_CORTE = ['ERR_STREAM_PREMATURE_CLOSE', 'FST_PREMATURE_CLOSE'];

/** Convierte los errores del lector multipart en errores propios, en español; el resto sigue su camino. */
function traducir(error: unknown): unknown {
  const codigo = (error as NodeJS.ErrnoException).code ?? '';
  if (codigo === 'FST_REQ_FILE_TOO_LARGE') return new SubidaDemasiadoGrande();
  if (CODIGOS_DE_DEMASIADAS_PARTES.includes(codigo)) return new SubidaConMasDeUnArchivo();
  if (CODIGOS_DE_CORTE.includes(codigo)) return new SubidaInterrumpida();
  return error;
}

/**
 * Lee el documento (PDF o foto) de una petición `multipart/form-data` con el tope más alto de los documentos. Si la
 * subida pasa del tope, el flujo se corta: se rechaza en vez de revisar un archivo incompleto.
 * @throws FaltaElDocumento si no trae archivo.
 * @throws SubidaDemasiadoGrande, SubidaConMasDeUnArchivo o SubidaInterrumpida si la subida no llegó completa o bien.
 */
export async function leerDocumentoDeSolicitud(solicitud: FastifyRequest): Promise<DocumentoSubido> {
  try {
    const parte = await solicitud.file({ limits: { fileSize: LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO } });
    if (!parte) throw new FaltaElDocumento();
    const contenido = await parte.toBuffer();
    if (parte.file.truncated) throw new SubidaDemasiadoGrande();
    return { contenido, nombre: parte.filename || null };
  } catch (error) {
    throw traducir(error);
  }
}
