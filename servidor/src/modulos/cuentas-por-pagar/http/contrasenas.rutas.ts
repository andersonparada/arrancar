import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ContrasenasControlador } from './contrasenas.controlador.js';
import {
  esquemaContrasena,
  esquemaDisponibles,
  esquemaFiltroDeContrasenas,
  esquemaParamsDeContrasena,
} from './contrasenas.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/contrasenas';

/** Contraseñas de pago: lista, ficha y documentos disponibles piden `contrasenas.ver`; crear, `contrasenas.crear`. */
export function rutasDeContrasenas(controlador: ContrasenasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'cuentas-por-pagar.contrasenas.ver' });
    app.get(RUTA, {
      schema: { tags, querystring: esquemaFiltroDeContrasenas },
      preHandler: ver,
      handler: controlador.listar,
    });
    // La ruta fija va antes que `/:id`.
    app.get(`${RUTA}/disponibles`, {
      schema: { tags, querystring: esquemaDisponibles },
      preHandler: ver,
      handler: controlador.disponibles,
    });
    app.get(`${RUTA}/:id`, {
      schema: { tags, params: esquemaParamsDeContrasena },
      preHandler: ver,
      handler: controlador.obtener,
    });
    app.post(RUTA, {
      schema: { tags, body: esquemaContrasena },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.contrasenas.crear' }),
      handler: controlador.crear,
    });
  };
}
