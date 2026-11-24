import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { CierresControlador } from './cierres.controlador.js';
import { esquemaCierre, esquemaParamsPeriodo, esquemaReapertura } from './cierres.esquemas-http.js';

const tags = ['Inventarios'];
type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

/** Las lecturas: la lista de cierres, la revisión de un mes y las existencias de un mes cerrado. */
function rutasDeLectura(app: Aplicacion, controlador: CierresControlador) {
  const ver = proteger({ permiso: 'inventarios.cierres.ver' });
  app.get('/inventarios/cierres', { schema: { tags }, preHandler: ver, handler: controlador.listar });
  app.get('/inventarios/cierres/:periodo/revision', {
    schema: { tags, params: esquemaParamsPeriodo },
    preHandler: ver,
    handler: controlador.revisar,
  });
  app.get('/inventarios/cierres/:periodo/existencias', {
    schema: { tags, params: esquemaParamsPeriodo },
    preHandler: ver,
    handler: controlador.existencias,
  });
}

/** Cerrar con `cierres.cerrar` y reabrir con `cierres.reabrir`. */
function rutasDeAccion(app: Aplicacion, controlador: CierresControlador) {
  app.post('/inventarios/cierres/:periodo/cerrar', {
    schema: { tags, params: esquemaParamsPeriodo, body: esquemaCierre },
    preHandler: proteger({ permiso: 'inventarios.cierres.cerrar' }),
    handler: controlador.cerrar,
  });
  app.post('/inventarios/cierres/:periodo/reabrir', {
    schema: { tags, params: esquemaParamsPeriodo, body: esquemaReapertura },
    preHandler: proteger({ permiso: 'inventarios.cierres.reabrir' }),
    handler: controlador.reabrir,
  });
}

/** El cierre mensual del inventario: ver con `cierres.ver`, cerrar con `.cerrar` y reabrir con `.reabrir`. */
export function rutasCierres(controlador: CierresControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLectura(app, controlador);
    rutasDeAccion(app, controlador);
  };
}
