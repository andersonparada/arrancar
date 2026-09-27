import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../http/guardias.js';
import type { ArchivosControlador } from './archivos.controlador.js';
import { esquemaConsultaArchivo, esquemaParamsArchivo } from './archivos.esquemas-http.js';

/** Imágenes de la empresa activa; solo exigen sesión y empresa activa. */
export function rutasArchivos(archivos: ArchivosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Archivos'];
    app.post('/archivos', {
      schema: { tags, consumes: ['multipart/form-data'] },
      preHandler: proteger(),
      handler: archivos.subir,
    });
    app.get('/archivos/:archivoId', {
      schema: { tags, params: esquemaParamsArchivo, querystring: esquemaConsultaArchivo },
      preHandler: proteger(),
      handler: archivos.obtener,
    });
  };
}
