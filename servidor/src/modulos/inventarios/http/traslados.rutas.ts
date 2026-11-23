import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaAnulacion, esquemaParamsDocumento } from './movimientos.esquemas-http.js';
import type { TrasladosControlador } from './traslados.controlador.js';
import { esquemaRecepcionDeTraslado, esquemaTraslado } from './traslados.esquemas-http.js';

const tags = ['Inventarios'];

/** Traslados entre bodegas: enviar, recibir (si pasan por tránsito), anular y la boleta. */
export function rutasTraslados(controlador: TrasladosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post('/inventarios/traslados', {
      schema: { tags, body: esquemaTraslado },
      preHandler: proteger({ permiso: 'inventarios.traslados.crear' }),
      handler: controlador.trasladar,
    });
    app.post('/inventarios/traslados/:documentoId/recibir', {
      schema: { tags, params: esquemaParamsDocumento, body: esquemaRecepcionDeTraslado },
      preHandler: proteger({ permiso: 'inventarios.traslados.recibir' }),
      handler: controlador.recibir,
    });
    app.post('/inventarios/traslados/:documentoId/anular', {
      schema: { tags, params: esquemaParamsDocumento, body: esquemaAnulacion },
      preHandler: proteger({ permiso: 'inventarios.traslados.anular' }),
      handler: controlador.anular,
    });
    app.get('/inventarios/documentos/:documentoId/boleta', {
      schema: { tags, params: esquemaParamsDocumento },
      preHandler: proteger({ permiso: 'inventarios.existencias.ver' }),
      handler: controlador.boleta,
    });
  };
}
