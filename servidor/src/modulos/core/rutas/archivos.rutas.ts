import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { archivosControlador } from '../controladores/archivos.controlador.js';
import { proteger } from '../http/guardias.js';
import { esquemaConsultaArchivo, esquemaParamsArchivo } from '../validaciones/archivos.validaciones.js';

export const rutasArchivos: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Archivos'];

  app.post('/archivos', {
    schema: { tags, consumes: ['multipart/form-data'] },
    preHandler: proteger(),
    handler: archivosControlador.subir,
  });

  app.get('/archivos/:archivoId', {
    schema: { tags, params: esquemaParamsArchivo, querystring: esquemaConsultaArchivo },
    preHandler: proteger(),
    handler: archivosControlador.obtener,
  });
};
