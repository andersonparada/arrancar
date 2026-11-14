import type { FastifyRequest } from 'fastify';
import type { ImagenSubida } from '../aplicacion/imagen-subida.js';
import { DatoInvalido } from '../dominio/errores.js';
import { leerUnSoloArchivo, traducirErrorDeMultipart } from './lectura-de-multipart.js';

export class FaltaLaImagen extends DatoInvalido {
  readonly codigo = 'falta_la_imagen';

  constructor() {
    super('Adjunte una imagen.');
  }
}

/**
 * Lee el archivo de una petición `multipart/form-data`: una sola parte, sin campos de texto.
 * @throws FaltaLaImagen si la petición no trae archivo.
 */
export async function leerImagenDeSolicitud(solicitud: FastifyRequest): Promise<ImagenSubida> {
  try {
    const archivo = await leerUnSoloArchivo(solicitud);
    if (!archivo) throw new FaltaLaImagen();
    return { contenido: archivo.contenido, nombreOriginal: archivo.nombre || null, tipoMime: archivo.tipoMime };
  } catch (error) {
    throw traducirErrorDeMultipart(error);
  }
}
