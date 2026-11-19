import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { MonedasControlador } from './monedas.controlador.js';
import { limitarMuestras } from './limite-de-muestras.js';
import {
  esquemaMonedaEditada,
  esquemaParamsMoneda,
  esquemaParamsMuestra,
  esquemaQueryMuestra,
} from './monedas.esquemas-http.js';

const tags = ['Monedas'];
const PERMISO_DE_SOPORTE = 'configuracion.monedas.editar';

/** Lo que solo hace soporte: la lista del Banguat, su actualización y su muestra, y editar una moneda. */
function rutasDeSoporte(monedas: MonedasControlador): FastifyPluginAsyncZod {
  const soporte = proteger({ permiso: PERMISO_DE_SOPORTE });
  return async (app) => {
    app.get('/monedas/banguat', { schema: { tags }, preHandler: soporte, handler: monedas.listarDelBanguat });
    app.post('/monedas/banguat/actualizar', {
      schema: { tags },
      preHandler: soporte,
      handler: monedas.actualizarLista,
    });
    app.get('/monedas/banguat/:codigo/muestra', {
      schema: { tags, params: esquemaParamsMuestra, querystring: esquemaQueryMuestra },
      preHandler: [soporte, limitarMuestras(app)],
      handler: monedas.muestra,
    });
    app.patch('/monedas/:codigo', {
      schema: { tags, params: esquemaParamsMoneda, body: esquemaMonedaEditada },
      preHandler: soporte,
      handler: monedas.editar,
    });
  };
}

/** Cualquier usuario con sesión lee las monedas; cambiarlas es solo de soporte. */
export function rutasMonedas(monedas: MonedasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/monedas', { schema: { tags }, preHandler: proteger(), handler: monedas.listar });
    await app.register(rutasDeSoporte(monedas));
  };
}
