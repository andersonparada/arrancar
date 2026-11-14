import type { FastifyRequest } from 'fastify';
import { DatoInvalido } from '../dominio/errores.js';

export class SubidaConMasDeUnArchivo extends DatoInvalido {
  readonly codigo = 'subida_con_mas_de_un_archivo';

  constructor() {
    super('Envíe un solo archivo, sin otros campos.');
  }
}

export class SubidaInterrumpida extends DatoInvalido {
  readonly codigo = 'subida_interrumpida';

  constructor() {
    super('La subida se interrumpió antes de terminar. Intente de nuevo.');
  }
}

export class SubidaNoEsDeArchivo extends DatoInvalido {
  readonly codigo = 'subida_no_es_de_archivo';

  constructor() {
    super('Envíe el archivo como formulario de archivos (multipart/form-data).');
  }
}

/**
 * Límites de una subida de un solo archivo: una sola parte y ningún campo de texto (los campos se guardan en
 * memoria antes de llegar al archivo). Ninguna pantalla manda campos junto al archivo.
 */
export const LIMITES_DE_UN_SOLO_ARCHIVO = { files: 1, parts: 1, fields: 0, fieldSize: 0 } as const;

const CODIGOS_DE_DEMASIADAS_PARTES = ['FST_FILES_LIMIT', 'FST_PARTS_LIMIT', 'FST_FIELDS_LIMIT'];
const CODIGOS_DE_CORTE = ['ERR_STREAM_PREMATURE_CLOSE', 'FST_PREMATURE_CLOSE', 'FST_PROTO_VIOLATION'];

/**
 * Traduce a errores propios, en español, los del lector multipart que no tienen que ver con el tamaño; el resto
 * (incluido `FST_REQ_FILE_TOO_LARGE`, que cada lector traduce a su error) sigue su camino.
 */
export function traducirErrorDeMultipart(error: unknown): unknown {
  const codigo = (error as NodeJS.ErrnoException).code ?? '';
  if (CODIGOS_DE_DEMASIADAS_PARTES.includes(codigo)) return new SubidaConMasDeUnArchivo();
  if (CODIGOS_DE_CORTE.includes(codigo)) return new SubidaInterrumpida();
  if (codigo === 'FST_INVALID_MULTIPART_CONTENT_TYPE') return new SubidaNoEsDeArchivo();
  return error;
}

/** El único archivo de una subida, ya leído. */
export interface ArchivoLeido {
  contenido: Buffer;
  /** El nombre con que lo mandó el navegador (puede venir vacío). */
  nombre: string;
  tipoMime: string;
  /** Nombre del campo del formulario. */
  campo: string;
  /** Si el flujo se cortó en el tope de tamaño. */
  truncado: boolean;
}

/**
 * Lee la única parte de una petición `multipart/form-data` y comprueba que no vengan más (otro archivo o un campo de
 * texto, antes o después): los campos de texto se guardarían en memoria sin tope.
 * @param tamanoMaximo tope del archivo en bytes; sin él, el global del servidor.
 * @returns `undefined` si la petición no trae ninguna parte.
 * @throws SubidaConMasDeUnArchivo si hay más de una parte o la parte es un campo de texto.
 * Los errores del lector (`FST_*`) salen sin traducir: use `traducirErrorDeMultipart`.
 */
export async function leerUnSoloArchivo(
  solicitud: FastifyRequest,
  tamanoMaximo?: number,
): Promise<ArchivoLeido | undefined> {
  const limits =
    tamanoMaximo === undefined ? LIMITES_DE_UN_SOLO_ARCHIVO : { ...LIMITES_DE_UN_SOLO_ARCHIVO, fileSize: tamanoMaximo };
  const partes = solicitud.parts({ limits });
  const primera = await partes.next();
  if (primera.done) return undefined;
  const parte = primera.value;
  if (parte.type !== 'file') throw new SubidaConMasDeUnArchivo();
  const contenido = await parte.toBuffer();
  if (!(await partes.next()).done) throw new SubidaConMasDeUnArchivo();
  return {
    contenido,
    nombre: parte.filename,
    tipoMime: parte.mimetype,
    campo: parte.fieldname,
    truncado: parte.file.truncated,
  };
}
