import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { CorreosControlador } from './correos.controlador.js';
import { esquemaCancelacionDeCorreo, esquemaFiltroDeCorreos, esquemaParamsDeCorreo } from './correos.esquemas-http.js';

const tags = ['Correos'];

/** El historial de correos de la empresa activa; cada ruta pide el permiso de su acción. */
export function rutasDeCorreos(correos: CorreosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/correos', {
      schema: { tags, querystring: esquemaFiltroDeCorreos },
      preHandler: proteger({ permiso: 'correos.ver' }),
      handler: correos.listar,
    });
    app.get('/correos/:id', {
      schema: { tags, params: esquemaParamsDeCorreo },
      preHandler: proteger({ permiso: 'correos.ver' }),
      handler: correos.obtener,
    });
    app.post('/correos/:id/cancelar', {
      schema: { tags, params: esquemaParamsDeCorreo, body: esquemaCancelacionDeCorreo },
      preHandler: proteger({ permiso: 'correos.cancelar' }),
      handler: correos.cancelar,
    });
    app.post('/correos/:id/reintentar', {
      schema: { tags, params: esquemaParamsDeCorreo },
      preHandler: proteger({ permiso: 'correos.reintentar' }),
      handler: correos.reintentar,
    });
  };
}
