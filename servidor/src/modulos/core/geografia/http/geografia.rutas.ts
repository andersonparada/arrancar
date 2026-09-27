import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { GeografiaControlador } from './geografia.controlador.js';
import { esquemaParamsDepartamento } from './geografia.esquemas-http.js';

/** Catálogo de departamentos y municipios; solo exige sesión y empresa activa. */
export function rutasGeografia(geografia: GeografiaControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Geografía'];
    app.get('/geografia/departamentos', {
      schema: { tags },
      preHandler: proteger(),
      handler: geografia.listarDepartamentos,
    });
    app.get('/geografia/departamentos/:codigo/municipios', {
      schema: { tags, params: esquemaParamsDepartamento },
      preHandler: proteger(),
      handler: geografia.listarMunicipios,
    });
  };
}
