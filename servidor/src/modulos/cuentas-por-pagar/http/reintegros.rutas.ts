import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ReintegrosControlador } from './reintegros.controlador.js';
import { esquemaAnularReintegro, esquemaParamsDeReintegro, esquemaReintegro } from './reintegros.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/reintegros';

/**
 * Los reintegros del proveedor: registrar (`reintegros.crear`), la ficha y el recibo (`documentos.ver`, como la nota de
 * crédito de donde salen) y anular (`reintegros.anular`).
 */
export function rutasDeReintegros(controlador: ReintegrosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'cuentas-por-pagar.documentos.ver' });
    app.post(RUTA, {
      schema: { tags, body: esquemaReintegro },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.reintegros.crear' }),
      handler: controlador.registrar,
    });
    app.get(`${RUTA}/:id`, {
      schema: { tags, params: esquemaParamsDeReintegro },
      preHandler: ver,
      handler: controlador.obtener,
    });
    app.get(`${RUTA}/:id/recibo`, {
      schema: { tags, params: esquemaParamsDeReintegro },
      preHandler: ver,
      handler: controlador.recibo,
    });
    app.post(`${RUTA}/:id/anular`, {
      schema: { tags, params: esquemaParamsDeReintegro, body: esquemaAnularReintegro },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.reintegros.anular' }),
      handler: controlador.anular,
    });
  };
}
