import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../http/guardias.js';
import type { ConfiguracionControlador } from './configuracion.controlador.js';
import {
  esquemaConsultaRestablecer,
  esquemaParamsConfiguracion,
  esquemaValorConfiguracion,
} from './configuracion.esquemas-http.js';

export function rutasConfiguracion(configuracion: ConfiguracionControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Configuración'];
    const gestionar = proteger({ permiso: 'configuracion.gestionar' });
    app.get('/configuracion', {
      schema: { tags },
      preHandler: proteger({ permiso: 'configuracion.ver' }),
      handler: configuracion.listar,
    });
    app.put('/configuracion/:clave', {
      schema: { tags, params: esquemaParamsConfiguracion, body: esquemaValorConfiguracion },
      preHandler: gestionar,
      handler: configuracion.establecer,
    });
    app.delete('/configuracion/:clave', {
      schema: { tags, params: esquemaParamsConfiguracion, querystring: esquemaConsultaRestablecer },
      preHandler: gestionar,
      handler: configuracion.restablecer,
    });
  };
}
