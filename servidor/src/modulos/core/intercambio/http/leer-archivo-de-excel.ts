import type { FastifyRequest } from 'fastify';
import { DatoInvalido } from '../../compartido/dominio/errores.js';
import { ArchivoDemasiadoGrande } from '../aplicacion/errores.js';

const MEGABYTE = 1024 * 1024;
/** Lo máximo que pesa un Excel para importar; con 5,000 filas sobra. */
export const MAXIMO_DE_EXCEL_EN_MB = 5;

export class FaltaElArchivo extends DatoInvalido {
  readonly codigo = 'falta_el_archivo';

  constructor() {
    super('Adjunte el archivo de Excel.');
  }
}

/** El archivo subido y el nombre con que lo mandó el navegador (solo para mostrar). */
export interface ArchivoSubido {
  contenido: Buffer;
  nombre: string;
}

/**
 * Lee el archivo de una petición `multipart/form-data` con el tope de tamaño de
 * los Excel (más bajo que el de las imágenes).
 * @throws FaltaElArchivo si no trae archivo.
 * @throws ArchivoDemasiadoGrande si pesa más del máximo.
 */
export async function leerArchivoConNombre(solicitud: FastifyRequest): Promise<ArchivoSubido> {
  const parte = await solicitud.file({ limits: { fileSize: MAXIMO_DE_EXCEL_EN_MB * MEGABYTE } });
  if (!parte) throw new FaltaElArchivo();
  const contenido = await parte.toBuffer().catch((error: NodeJS.ErrnoException) => {
    throw error.code === 'FST_REQ_FILE_TOO_LARGE' ? new ArchivoDemasiadoGrande(MAXIMO_DE_EXCEL_EN_MB) : error;
  });
  if (parte.file.truncated) throw new ArchivoDemasiadoGrande(MAXIMO_DE_EXCEL_EN_MB);
  return { contenido, nombre: parte.filename };
}

/** Lo mismo, solo con el contenido. */
export async function leerArchivoDeExcel(solicitud: FastifyRequest): Promise<Buffer> {
  return (await leerArchivoConNombre(solicitud)).contenido;
}
