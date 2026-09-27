import type { FastifyRequest } from 'fastify';
import type { ImagenSubida } from '../aplicacion/imagen-subida.js';
import { DatoInvalido } from '../dominio/errores.js';

export class FaltaLaImagen extends DatoInvalido {
  readonly codigo = 'falta_la_imagen';

  constructor() {
    super('Adjunte una imagen.');
  }
}

/**
 * Lee el primer archivo de una petición `multipart/form-data`.
 * @throws FaltaLaImagen si la petición no trae archivo.
 */
export async function leerImagenDeSolicitud(solicitud: FastifyRequest): Promise<ImagenSubida> {
  const parte = await solicitud.file();
  if (!parte) throw new FaltaLaImagen();
  return {
    contenido: await parte.toBuffer(),
    nombreOriginal: parte.filename || null,
    tipoMime: parte.mimetype,
  };
}
