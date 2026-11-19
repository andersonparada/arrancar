import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { TiposDeCambioControlador } from './tipos-de-cambio.controlador.js';
import {
  esquemaConsultaSerie,
  esquemaConsultaVigente,
  esquemaParamsVersiones,
  esquemaTipoManual,
} from './tipos-de-cambio.esquemas-http.js';

const PERMISO_DE_SOPORTE = 'configuracion.tipos-de-cambio.crear';

/** Cualquier usuario con sesión lee los tipos; ingresar o corregir uno (y ver sus versiones) es solo de soporte. */
export function rutasTiposDeCambio(tipos: TiposDeCambioControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Tipos de cambio'];
    app.get('/tipos-de-cambio', {
      schema: { tags, querystring: esquemaConsultaSerie },
      preHandler: proteger(),
      handler: tipos.serie,
    });
    app.get('/tipos-de-cambio/vigente', {
      schema: { tags, querystring: esquemaConsultaVigente },
      preHandler: proteger(),
      handler: tipos.vigente,
    });
    app.get('/tipos-de-cambio/:moneda/:fecha/versiones', {
      schema: { tags, params: esquemaParamsVersiones },
      preHandler: proteger({ permiso: PERMISO_DE_SOPORTE }),
      handler: tipos.versiones,
    });
    app.post('/tipos-de-cambio', {
      schema: { tags, body: esquemaTipoManual },
      preHandler: proteger({ permiso: PERMISO_DE_SOPORTE }),
      handler: tipos.registrar,
    });
  };
}
