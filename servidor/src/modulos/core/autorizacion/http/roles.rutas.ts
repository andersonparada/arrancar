import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { RolesControlador } from './roles.controlador.js';
import { esquemaParamsRol, esquemaRol } from './roles.esquemas-http.js';

export function rutasRoles(roles: RolesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Roles'];
    const ver = proteger({ permiso: 'roles.ver' });
    const crear = proteger({ permiso: 'roles.crear' });
    const editar = proteger({ permiso: 'roles.editar' });
    const eliminar = proteger({ permiso: 'roles.eliminar' });
    app.get('/roles', { schema: { tags }, preHandler: ver, handler: roles.listar });
    app.get('/permisos', { schema: { tags }, preHandler: ver, handler: roles.listarPermisos });
    app.post('/roles', { schema: { tags, body: esquemaRol }, preHandler: crear, handler: roles.crear });
    app.put('/roles/:rolId', {
      schema: { tags, params: esquemaParamsRol, body: esquemaRol },
      preHandler: editar,
      handler: roles.actualizar,
    });
    app.delete('/roles/:rolId', {
      schema: { tags, params: esquemaParamsRol },
      preHandler: eliminar,
      handler: roles.eliminar,
    });
  };
}
