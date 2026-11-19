import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { DepreciacionControlador } from './depreciacion.controlador.js';
import { esquemaCierre, esquemaParamsPeriodo, esquemaReapertura } from './depreciacion.esquemas-http.js';

const etiquetas = ['Activos fijos'];

/** El cierre mensual de depreciación: ver con `depreciacion.ver`, cerrar con `.cerrar` y reabrir con `.reabrir`. */
export function rutasDepreciacion(controlador: DepreciacionControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/activos-fijos/depreciacion', {
      schema: { tags: etiquetas },
      preHandler: proteger({ permiso: 'activos-fijos.depreciacion.ver' }),
      handler: controlador.listar,
    });
    app.get('/activos-fijos/depreciacion/:periodo/revision', {
      schema: { tags: etiquetas, params: esquemaParamsPeriodo },
      preHandler: proteger({ permiso: 'activos-fijos.depreciacion.ver' }),
      handler: controlador.revisar,
    });
    app.post('/activos-fijos/depreciacion/:periodo/cerrar', {
      schema: { tags: etiquetas, params: esquemaParamsPeriodo, body: esquemaCierre },
      preHandler: proteger({ permiso: 'activos-fijos.depreciacion.cerrar' }),
      handler: controlador.cerrar,
    });
    app.post('/activos-fijos/depreciacion/:periodo/reabrir', {
      schema: { tags: etiquetas, params: esquemaParamsPeriodo, body: esquemaReapertura },
      preHandler: proteger({ permiso: 'activos-fijos.depreciacion.reabrir' }),
      handler: controlador.reabrir,
    });
  };
}
