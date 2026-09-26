import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { rolesControlador } from '../controladores/roles.controlador.js';
import { proteger } from '../http/guardias.js';
import { esquemaParamsRol, esquemaRol } from '../validaciones/roles.validaciones.js';

export const rutasRoles: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Roles'];

  app.get('/roles', {
    schema: { tags },
    preHandler: proteger({ permiso: 'roles.ver' }),
    handler: rolesControlador.listar,
  });

  app.get('/permisos', {
    schema: { tags },
    preHandler: proteger({ permiso: 'roles.ver' }),
    handler: rolesControlador.catalogoPermisos,
  });

  app.post('/roles', {
    schema: { tags, body: esquemaRol },
    preHandler: proteger({ permiso: 'roles.gestionar' }),
    handler: rolesControlador.crear,
  });

  app.put('/roles/:rolId', {
    schema: { tags, params: esquemaParamsRol, body: esquemaRol },
    preHandler: proteger({ permiso: 'roles.gestionar' }),
    handler: rolesControlador.actualizar,
  });

  app.delete('/roles/:rolId', {
    schema: { tags, params: esquemaParamsRol },
    preHandler: proteger({ permiso: 'roles.gestionar' }),
    handler: rolesControlador.eliminar,
  });
};
