import type { FastifyReply, FastifyRequest } from 'fastify';
import { empresaActivaDe } from '../http/contexto-solicitud.js';
import { leerImagenDeSolicitud } from '../http/leer-imagen.js';
import { archivosServicio, type VarianteImagen } from '../servicios/archivos.servicio.js';
import type { ConsultaArchivo, ParamsArchivo } from '../validaciones/archivos.validaciones.js';

/** Envía una imagen con caché larga: el contenido de un id nunca cambia. */
export async function enviarImagen(respuesta: FastifyReply, abrir: () => ReturnType<typeof archivosServicio.abrir>) {
  const { archivo, contenido } = await abrir();
  return respuesta
    .header('Content-Type', archivo.tipoMime)
    .header('Cache-Control', 'private, max-age=31536000, immutable')
    .send(contenido);
}

export const archivosControlador = {
  async subir(solicitud: FastifyRequest, respuesta: FastifyReply) {
    const imagen = await leerImagenDeSolicitud(solicitud);
    const archivo = await archivosServicio.subirImagen(empresaActivaDe(solicitud), imagen);
    return respuesta.status(201).send(archivo);
  },

  async obtener(
    solicitud: FastifyRequest<{ Params: ParamsArchivo; Querystring: ConsultaArchivo }>,
    respuesta: FastifyReply,
  ) {
    const variante: VarianteImagen = solicitud.query.variante;
    return enviarImagen(respuesta, () =>
      archivosServicio.abrir(empresaActivaDe(solicitud), solicitud.params.archivoId, variante),
    );
  },
};
