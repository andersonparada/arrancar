import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { AnticiposControlador } from './anticipos.controlador.js';
import {
  esquemaAnticipo,
  esquemaAnularAnticipo,
  esquemaLiquidarAnticipo,
  esquemaListaDeAnticipos,
  esquemaParamsDeAnticipo,
  esquemaReabrirAnticipo,
} from './anticipos.esquemas-http.js';

const tags = ['Cuentas por liquidar'];
const RUTA = '/cuentas-por-liquidar/anticipos';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

/** Lista, ficha, entrega y anulación. */
function rutasDeEntrega(app: Aplicacion, controlador: AnticiposControlador): void {
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
}

/** Liquidar un anticipo abierto y reabrir uno liquidado: los dos piden `anticipos.liquidar`. */
function rutasDeLiquidacion(app: Aplicacion, controlador: AnticiposControlador): void {
  const liquidar = proteger({ permiso: 'cuentas-por-liquidar.anticipos.liquidar' });
  app.post(`${RUTA}/:id/liquidar`, {
    schema: { tags, params: esquemaParamsDeAnticipo, body: esquemaLiquidarAnticipo },
    preHandler: liquidar,
    handler: controlador.liquidar,
  });
  app.post(`${RUTA}/:id/reabrir`, {
    schema: { tags, params: esquemaParamsDeAnticipo, body: esquemaReabrirAnticipo },
    preHandler: liquidar,
    handler: controlador.reabrir,
  });
}

/**
 * Los anticipos: lista con fecha de corte y ficha (`anticipos.ver`), entregar (`anticipos.crear`) y anular uno sin gastos
 * (`anticipos.anular`), liquidar y reabrir uno liquidado (`anticipos.liquidar`).
 */
export function rutasDeAnticipos(controlador: AnticiposControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeEntrega(app, controlador);
    rutasDeLiquidacion(app, controlador);
  };
}
