import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { limitarSubidas } from '../../core/archivos/http/limite-de-subidas.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { BalanceDeAperturaControlador } from './balance-de-apertura.controlador.js';
import { esquemaParamsEmpresa as params } from './empresas.esquemas-http.js';

const tags = ['Empresas'];
const RUTA = '/empresas/:empresaId/carga-inicial/balance-de-apertura';

/**
 * El balance de apertura firmado (PDF): lo sube, reemplaza y quita quien puede cerrar la carga (la subida tiene su límite
 * por minuto); verlo es de quien puede ver los cierres guardados.
 */
export function rutasDelBalanceDeApertura(controlador: BalanceDeAperturaControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const cerrar = proteger({ permiso: 'empresas.carga-inicial.cerrar' });
    app.get(RUTA, {
      schema: { tags, params },
      preHandler: proteger({ permiso: 'empresas.carga-inicial.ver-cierres' }),
      handler: controlador.abrir,
    });
    app.post(RUTA, {
      schema: { tags, params, consumes: ['multipart/form-data'] },
      preHandler: [cerrar, limitarSubidas(app)],
      handler: controlador.subir,
    });
    app.delete(RUTA, { schema: { tags, params }, preHandler: cerrar, handler: controlador.quitar });
  };
}
