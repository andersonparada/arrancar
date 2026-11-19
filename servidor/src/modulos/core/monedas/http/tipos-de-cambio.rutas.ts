import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { TiposDeCambioControlador } from './tipos-de-cambio.controlador.js';
import {
  esquemaCargaManual,
  esquemaConsultaSerie,
  esquemaConsultaVigente,
  esquemaParamsVersiones,
  esquemaTipoManual,
} from './tipos-de-cambio.esquemas-http.js';

const PERMISO_DE_SOPORTE = 'configuracion.tipos-de-cambio.crear';
const tags = ['Tipos de cambio'];

/** Lo que lee cualquier usuario con sesión. */
function rutasDeLectura(tipos: TiposDeCambioControlador): FastifyPluginAsyncZod {
  return async (app) => {
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
  };
}

/** Lo que solo hace soporte: ver versiones, ingresar o corregir un tipo y cargar del Banguat ahora. */
function rutasDeSoporte(tipos: TiposDeCambioControlador): FastifyPluginAsyncZod {
  const preHandler = proteger({ permiso: PERMISO_DE_SOPORTE });
  return async (app) => {
    app.get('/tipos-de-cambio/:moneda/:fecha/versiones', {
      schema: { tags, params: esquemaParamsVersiones },
      preHandler,
      handler: tipos.versiones,
    });
    app.post('/tipos-de-cambio/cargar', {
      schema: { tags, body: esquemaCargaManual },
      preHandler,
      handler: tipos.cargar,
    });
    app.post('/tipos-de-cambio', { schema: { tags, body: esquemaTipoManual }, preHandler, handler: tipos.registrar });
  };
}

/** Cualquier usuario con sesión lee los tipos; ingresar o corregir uno (y ver sus versiones) es solo de soporte. */
export function rutasTiposDeCambio(tipos: TiposDeCambioControlador): FastifyPluginAsyncZod {
  return async (app) => {
    await app.register(rutasDeLectura(tipos));
    await app.register(rutasDeSoporte(tipos));
  };
}
