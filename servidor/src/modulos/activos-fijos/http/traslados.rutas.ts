import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { TrasladosControlador } from './traslados.controlador.js';
import { esquemaAnulacionDeTraslado, esquemaParamsBoleta, esquemaTraslado } from './traslados.esquemas-http.js';

const etiquetas = ['Activos fijos'];

/** Trasladar con `traslados.crear`, anular la boleta con `traslados.anular` y verla (imprimirla) con `activos.ver`. */
export function rutasTraslados(controlador: TrasladosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post('/activos-fijos/traslados', {
      schema: { tags: etiquetas, body: esquemaTraslado },
      preHandler: proteger({ permiso: 'activos-fijos.traslados.crear' }),
      handler: controlador.trasladar,
    });
    app.post('/activos-fijos/traslados/:grupoId/anular', {
      schema: { tags: etiquetas, params: esquemaParamsBoleta, body: esquemaAnulacionDeTraslado },
      preHandler: proteger({ permiso: 'activos-fijos.traslados.anular' }),
      handler: controlador.anular,
    });
    app.get('/activos-fijos/traslados/:grupoId/boleta', {
      schema: { tags: etiquetas, params: esquemaParamsBoleta },
      preHandler: proteger({ permiso: 'activos-fijos.activos.ver' }),
      handler: controlador.obtenerBoleta,
    });
  };
}
