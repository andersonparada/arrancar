import type { FastifyRequest } from 'fastify';
import { ErrorSolicitudInvalida } from '../errores/errores.js';
import type { ImagenSubida } from '../servicios/archivos.servicio.js';

/**
 * Lee el primer archivo de una petición `multipart/form-data`.
 * @throws ErrorSolicitudInvalida si la petición no trae archivo.
 */
export async function leerImagenDeSolicitud(solicitud: FastifyRequest): Promise<ImagenSubida> {
  const parte = await solicitud.file();
  if (!parte) throw new ErrorSolicitudInvalida('Adjunte una imagen.');
  return {
    contenido: await parte.toBuffer(),
    nombreOriginal: parte.filename || null,
    tipoMime: parte.mimetype,
  };
}
