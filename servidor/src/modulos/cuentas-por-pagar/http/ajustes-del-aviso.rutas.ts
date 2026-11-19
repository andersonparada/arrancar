import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { AjustesDelAvisoControlador } from './ajustes-del-aviso.controlador.js';
import { esquemaAjustesDelAviso } from './ajustes-del-aviso.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/avisos-de-pago/ajustes';

/** Ver y guardar los ajustes de los avisos de pago de la empresa, con un solo permiso: `avisos-de-pago.configurar`. */
export function rutasDeAjustesDelAviso(controlador: AjustesDelAvisoControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const configurar = proteger({ permiso: 'cuentas-por-pagar.avisos-de-pago.configurar' });
    app.get(RUTA, { schema: { tags }, preHandler: configurar, handler: controlador.obtener });
    app.put(RUTA, {
      schema: { tags, body: esquemaAjustesDelAviso },
      preHandler: configurar,
      handler: controlador.guardar,
    });
  };
}
