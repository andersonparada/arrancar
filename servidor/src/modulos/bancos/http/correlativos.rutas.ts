import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { CorrelativosControlador } from './correlativos.controlador.js';
import { esquemaFiltroDeCorrelativos } from './correlativos.esquemas-http.js';

/** Reporte de correlativos: los huecos de la numeración, explicados con la auditoría. Es de solo lectura. */
export function rutasCorrelativos(controlador: CorrelativosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/bancos/correlativos', {
      schema: { tags: ['Bancos'], querystring: esquemaFiltroDeCorrelativos },
      preHandler: proteger({ permiso: 'bancos.movimientos.ver' }),
      handler: controlador.reporte,
    });
  };
}
