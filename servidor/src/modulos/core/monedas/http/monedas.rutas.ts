import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { MonedasControlador } from './monedas.controlador.js';
import { esquemaMonedaEditada, esquemaParamsMoneda } from './monedas.esquemas-http.js';

/** Cualquier usuario con sesión lee las monedas; cambiarlas es solo de soporte. */
export function rutasMonedas(monedas: MonedasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Monedas'];
    app.get('/monedas', { schema: { tags }, preHandler: proteger(), handler: monedas.listar });
    app.get('/monedas/banguat', {
      schema: { tags },
      preHandler: proteger({ permiso: 'configuracion.monedas.editar' }),
      handler: monedas.listarDelBanguat,
    });
    app.post('/monedas/banguat/actualizar', {
      schema: { tags },
      preHandler: proteger({ permiso: 'configuracion.monedas.editar' }),
      handler: monedas.actualizarLista,
    });
    app.patch('/monedas/:codigo', {
      schema: { tags, params: esquemaParamsMoneda, body: esquemaMonedaEditada },
      preHandler: proteger({ permiso: 'configuracion.monedas.editar' }),
      handler: monedas.editar,
    });
  };
}
