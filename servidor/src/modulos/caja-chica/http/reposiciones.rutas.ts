import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaParamsDeFondo } from './fondos.esquemas-http.js';
import type { ReposicionesControlador } from './reposiciones.controlador.js';
import { esquemaAnularReposicion, esquemaParamsDeReposicion, esquemaReposicion } from './reposiciones.esquemas-http.js';

const tags = ['Caja chica'];
const RUTA = '/caja-chica';

/**
 * Las reposiciones: la lista de un fondo, su solicitud (lo pendiente y su desglose) y la ficha de una reposición
 * (`fondos.ver`, solo los fondos asignados al usuario), reponer (`reposiciones.crear`) y anular (`reposiciones.anular`).
 */
export function rutasDeReposiciones(controlador: ReposicionesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    consultas(app, controlador);
    cambios(app, controlador);
  };
}

function consultas(app: FastifyInstance, controlador: ReposicionesControlador): void {
  const ver = proteger({ permiso: 'caja-chica.fondos.ver' });
  const params = esquemaParamsDeFondo;
  app.get(`${RUTA}/fondos/:id/reposiciones`, {
    schema: { tags, params },
    preHandler: ver,
    handler: controlador.listar,
  });
  app.get(`${RUTA}/fondos/:id/solicitud-de-reposicion`, {
    schema: { tags, params },
    preHandler: ver,
    handler: controlador.solicitud,
  });
  app.get(`${RUTA}/reposiciones/:id`, {
    schema: { tags, params: esquemaParamsDeReposicion },
    preHandler: ver,
    handler: controlador.obtener,
  });
}

function cambios(app: FastifyInstance, controlador: ReposicionesControlador): void {
  app.post(`${RUTA}/fondos/:id/reposiciones`, {
    schema: { tags, params: esquemaParamsDeFondo, body: esquemaReposicion },
    preHandler: proteger({ permiso: 'caja-chica.reposiciones.crear' }),
    handler: controlador.registrar,
  });
  app.post(`${RUTA}/reposiciones/:id/anular`, {
    schema: { tags, params: esquemaParamsDeReposicion, body: esquemaAnularReposicion },
    preHandler: proteger({ permiso: 'caja-chica.reposiciones.anular' }),
    handler: controlador.anular,
  });
}
