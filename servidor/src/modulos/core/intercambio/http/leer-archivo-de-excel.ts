import type { FastifyRequest } from 'fastify';
import { DatoInvalido } from '../../compartido/dominio/errores.js';
import { leerUnSoloArchivo, traducirErrorDeMultipart } from '../../compartido/http/lectura-de-multipart.js';
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
  const archivo = await leerUnSoloArchivo(solicitud, MAXIMO_DE_EXCEL_EN_MB * MEGABYTE).catch(
    (error: NodeJS.ErrnoException) => {
      throw error.code === 'FST_REQ_FILE_TOO_LARGE'
        ? new ArchivoDemasiadoGrande(MAXIMO_DE_EXCEL_EN_MB)
        : traducirErrorDeMultipart(error);
    },
  );
  if (!archivo) throw new FaltaElArchivo();
  if (archivo.truncado) throw new ArchivoDemasiadoGrande(MAXIMO_DE_EXCEL_EN_MB);
  return { contenido: archivo.contenido, nombre: archivo.nombre };
}

/** Lo mismo, solo con el contenido. */
export async function leerArchivoDeExcel(solicitud: FastifyRequest): Promise<Buffer> {
  return (await leerArchivoConNombre(solicitud)).contenido;
}
