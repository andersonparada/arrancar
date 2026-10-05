import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { FeriadosControlador } from './feriados.controlador.js';
import { esquemaAsuetoSolicitado, esquemaConsultaFeriados, esquemaParamsAsueto } from './feriados.esquemas-http.js';

/** Cualquier usuario con sesión lee el calendario; agregar y quitar asuetos es solo de soporte. */
export function rutasFeriados(feriados: FeriadosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Calendario'];
    app.get('/feriados', {
      schema: { tags, querystring: esquemaConsultaFeriados },
      preHandler: proteger(),
      handler: feriados.listar,
    });
    app.post('/feriados', {
      schema: { tags, body: esquemaAsuetoSolicitado },
      preHandler: proteger({ permiso: 'configuracion.feriados.crear' }),
      handler: feriados.agregar,
    });
    app.delete('/feriados/:id', {
      schema: { tags, params: esquemaParamsAsueto },
      preHandler: proteger({ permiso: 'configuracion.feriados.eliminar' }),
      handler: feriados.quitar,
    });
  };
}
