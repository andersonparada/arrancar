import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { EmpresasControlador } from './empresas.controlador.js';
import { esquemaEmpresa, esquemaParamsEmpresa } from './empresas.esquemas-http.js';

const etiquetas = ['Empresas'];

export function rutasEmpresas(controlador: EmpresasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'empresas.ver' });
    const crear = proteger({ permiso: 'empresas.crear' });
    const editar = proteger({ permiso: 'empresas.editar' });

    app.get('/empresas', { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get('/empresas/:empresaId', {
      schema: { tags: etiquetas, params: esquemaParamsEmpresa },
      preHandler: ver,
      handler: controlador.obtener,
    });
    app.post('/empresas', {
      schema: { tags: etiquetas, body: esquemaEmpresa },
      preHandler: crear,
      handler: controlador.registrar,
    });
    app.put('/empresas/:empresaId', {
      schema: { tags: etiquetas, params: esquemaParamsEmpresa, body: esquemaEmpresa },
      preHandler: editar,
      handler: controlador.actualizar,
    });
  };
}
