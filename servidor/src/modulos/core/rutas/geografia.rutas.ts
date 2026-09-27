import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { geografiaControlador } from '../controladores/geografia.controlador.js';
import { proteger } from '../http/guardias.js';
import { esquemaParamsDepartamento } from '../validaciones/geografia.validaciones.js';

/** Catálogo de departamentos y municipios; solo exige sesión y empresa activa. */
export const rutasGeografia: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Geografía'];

  app.get('/geografia/departamentos', {
    schema: { tags },
    preHandler: proteger(),
    handler: geografiaControlador.listarDepartamentos,
  });

  app.get('/geografia/departamentos/:codigo/municipios', {
    schema: { tags, params: esquemaParamsDepartamento },
    preHandler: proteger(),
    handler: geografiaControlador.listarMunicipios,
  });
};
