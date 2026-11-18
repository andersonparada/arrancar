import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ConsultaDePagosControlador } from './consulta-de-pagos.controlador.js';
import { esquemaListaDePagos } from './consulta-de-pagos.esquemas-http.js';
import { esquemaParamsDePago } from './pagos.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/pagos';

/** La lista, la ficha y el comprobante de los pagos: todo con `pagos.ver`. */
export function rutasDeConsultaDePagos(controlador: ConsultaDePagosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'cuentas-por-pagar.pagos.ver' });
    app.get(RUTA, { schema: { tags, querystring: esquemaListaDePagos }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:id`, {
      schema: { tags, params: esquemaParamsDePago },
      preHandler: ver,
      handler: controlador.obtener,
    });
    app.get(`${RUTA}/:id/comprobante`, {
      schema: { tags, params: esquemaParamsDePago },
      preHandler: ver,
      handler: controlador.comprobante,
    });
  };
}
