import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/http/guardias.js';
import { empresasControlador } from '../controladores/empresas.controlador.js';
import { esquemaEmpresa, esquemaParamsEmpresa } from '../validaciones/empresas.validaciones.js';

export const rutasEmpresas: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Empresas'];

  app.get('/empresas', {
    schema: { tags },
    preHandler: proteger({ permiso: 'empresas.ver' }),
    handler: empresasControlador.listar,
  });

  app.get('/empresas/:empresaId', {
    schema: { tags, params: esquemaParamsEmpresa },
    preHandler: proteger({ permiso: 'empresas.ver' }),
    handler: empresasControlador.obtener,
  });

  app.post('/empresas', {
    schema: { tags, body: esquemaEmpresa },
    preHandler: proteger({ permiso: 'empresas.gestionar' }),
    handler: empresasControlador.crear,
  });

  app.put('/empresas/:empresaId', {
    schema: { tags, params: esquemaParamsEmpresa, body: esquemaEmpresa },
    preHandler: proteger({ permiso: 'empresas.gestionar' }),
    handler: empresasControlador.actualizar,
  });
};
