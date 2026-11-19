import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaParamsActivo } from './activos.esquemas-http.js';
import type { CostosControlador } from './costos.controlador.js';
import { esquemaAnulacionDeCosto, esquemaCostoManual, esquemaParamsCosto } from './costos.esquemas-http.js';

const etiquetas = ['Activos fijos'];

/** Los costos de un activo: verlos con `activos.ver`, sumar uno a mano con `costos.crear` y anular con `costos.anular`. */
export function rutasCostos(controlador: CostosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/activos-fijos/activos/:activoId/costos', {
      schema: { tags: etiquetas, params: esquemaParamsActivo },
      preHandler: proteger({ permiso: 'activos-fijos.activos.ver' }),
      handler: controlador.listar,
    });
    app.post('/activos-fijos/activos/:activoId/costos', {
      schema: { tags: etiquetas, params: esquemaParamsActivo, body: esquemaCostoManual },
      preHandler: proteger({ permiso: 'activos-fijos.costos.crear' }),
      handler: controlador.registrarManual,
    });
    app.post('/activos-fijos/costos/:costoId/anular', {
      schema: { tags: etiquetas, params: esquemaParamsCosto, body: esquemaAnulacionDeCosto },
      preHandler: proteger({ permiso: 'activos-fijos.costos.anular' }),
      handler: controlador.anular,
    });
  };
}
