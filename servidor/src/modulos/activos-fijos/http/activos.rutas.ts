import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ActivosControlador } from './activos.controlador.js';
import {
  esquemaActivo,
  esquemaEdicionDeActivo,
  esquemaFiltrosDeActivos,
  esquemaOcioDeActivo,
  esquemaParamsActivo,
} from './activos.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Activos fijos'];
const RUTA = '/activos-fijos/activos';
const conId = { tags: etiquetas, params: esquemaParamsActivo };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: ActivosControlador) {
  const editar = proteger({ permiso: 'activos-fijos.activos.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaActivo },
    preHandler: proteger({ permiso: 'activos-fijos.activos.crear' }),
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:activoId`, {
    schema: { ...conId, body: esquemaEdicionDeActivo },
    preHandler: editar,
    handler: controlador.editar,
  });
  app.post(`${RUTA}/:activoId/ocioso`, {
    schema: { ...conId, body: esquemaOcioDeActivo },
    preHandler: editar,
    handler: controlador.marcarOcioso,
  });
  app.delete(`${RUTA}/:activoId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'activos-fijos.activos.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasActivos(controlador: ActivosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'activos-fijos.activos.ver' });

    app.get(RUTA, {
      schema: { tags: etiquetas, querystring: esquemaFiltrosDeActivos },
      preHandler: ver,
      handler: controlador.listar,
    });
    // Antes de `/:activoId` para que no se tome «ubicaciones» por un id (AF-P22 b).
    app.get('/activos-fijos/ubicaciones', {
      schema: { tags: etiquetas },
      preHandler: ver,
      handler: controlador.ubicaciones,
    });
    app.get(`${RUTA}/:activoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
  };
}
