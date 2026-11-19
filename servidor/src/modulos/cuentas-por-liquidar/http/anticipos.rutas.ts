import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { AnticiposControlador } from './anticipos.controlador.js';
import {
  esquemaAnticipo,
  esquemaAnularAnticipo,
  esquemaListaDeAnticipos,
  esquemaParamsDeAnticipo,
} from './anticipos.esquemas-http.js';

const tags = ['Cuentas por liquidar'];
const RUTA = '/cuentas-por-liquidar/anticipos';

/**
 * Los anticipos: lista con fecha de corte y ficha (`anticipos.ver`), entregar (`anticipos.crear`) y anular uno sin gastos
 * (`anticipos.anular`).
 */
export function rutasDeAnticipos(controlador: AnticiposControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'cuentas-por-liquidar.anticipos.ver' });
    app.get(RUTA, {
      schema: { tags, querystring: esquemaListaDeAnticipos },
      preHandler: ver,
      handler: controlador.listar,
    });
    app.get(`${RUTA}/:id`, {
      schema: { tags, params: esquemaParamsDeAnticipo },
      preHandler: ver,
      handler: controlador.obtener,
    });
    app.post(RUTA, {
      schema: { tags, body: esquemaAnticipo },
      preHandler: proteger({ permiso: 'cuentas-por-liquidar.anticipos.crear' }),
      handler: controlador.entregar,
    });
    app.post(`${RUTA}/:id/anular`, {
      schema: { tags, params: esquemaParamsDeAnticipo, body: esquemaAnularAnticipo },
      preHandler: proteger({ permiso: 'cuentas-por-liquidar.anticipos.anular' }),
      handler: controlador.anular,
    });
  };
}
