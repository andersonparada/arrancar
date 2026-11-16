import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { RetirosControlador } from './retiros.controlador.js';
import {
  esquemaCambiarRetiro,
  esquemaLiquidarRetiro,
  esquemaListaDeRetiros,
  esquemaParamsDeRetiro,
  esquemaRetiro,
} from './retiros.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/retiros';

/**
 * Los retiros de efectivo para pagos: lista con fecha de corte y ficha (`retiros.ver`), registrar (`retiros.crear`),
 * liquidar y reabrir (`retiros.liquidar`) y anular un retiro sin pagos (`retiros.anular`).
 */
export function rutasDeRetiros(controlador: RetirosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    consultas(app, controlador);
    cambios(app, controlador);
  };
}

function consultas(app: FastifyInstance, controlador: RetirosControlador): void {
  const ver = proteger({ permiso: 'cuentas-por-pagar.retiros.ver' });
  app.get(RUTA, { schema: { tags, querystring: esquemaListaDeRetiros }, preHandler: ver, handler: controlador.listar });
  app.get(`${RUTA}/:id`, {
    schema: { tags, params: esquemaParamsDeRetiro },
    preHandler: ver,
    handler: controlador.obtener,
  });
}

function cambios(app: FastifyInstance, controlador: RetirosControlador): void {
  const liquidar = proteger({ permiso: 'cuentas-por-pagar.retiros.liquidar' });
  app.post(RUTA, {
    schema: { tags, body: esquemaRetiro },
    preHandler: proteger({ permiso: 'cuentas-por-pagar.retiros.crear' }),
    handler: controlador.registrar,
  });
  app.post(`${RUTA}/:id/liquidar`, {
    schema: { tags, params: esquemaParamsDeRetiro, body: esquemaLiquidarRetiro },
    preHandler: liquidar,
    handler: controlador.liquidar,
  });
  app.post(`${RUTA}/:id/reabrir`, {
    schema: { tags, params: esquemaParamsDeRetiro, body: esquemaCambiarRetiro },
    preHandler: liquidar,
    handler: controlador.reabrir,
  });
  app.post(`${RUTA}/:id/anular`, {
    schema: { tags, params: esquemaParamsDeRetiro, body: esquemaCambiarRetiro },
    preHandler: proteger({ permiso: 'cuentas-por-pagar.retiros.anular' }),
    handler: controlador.anular,
  });
}
