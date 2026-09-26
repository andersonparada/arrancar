import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { configuracionControlador } from '../controladores/configuracion.controlador.js';
import { proteger } from '../http/guardias.js';
import {
  esquemaConsultaRestablecer,
  esquemaParamsConfiguracion,
  esquemaValorConfiguracion,
} from '../validaciones/configuracion.validaciones.js';

export const rutasConfiguracion: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Configuración'];

  app.get('/configuracion', {
    schema: { tags },
    preHandler: proteger({ permiso: 'configuracion.ver' }),
    handler: configuracionControlador.listar,
  });

  app.put('/configuracion/:clave', {
    schema: { tags, params: esquemaParamsConfiguracion, body: esquemaValorConfiguracion },
    preHandler: proteger({ permiso: 'configuracion.gestionar' }),
    handler: configuracionControlador.establecer,
  });

  app.delete('/configuracion/:clave', {
    schema: { tags, params: esquemaParamsConfiguracion, querystring: esquemaConsultaRestablecer },
    preHandler: proteger({ permiso: 'configuracion.gestionar' }),
    handler: configuracionControlador.restablecer,
  });
};
