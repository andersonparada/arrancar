import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { AjustesControlador } from './ajustes.controlador.js';
import { esquemaAjustarSaldo, esquemaAnularAjuste, esquemaParamsDeAjuste } from './ajustes.esquemas-http.js';
import { esquemaParamsDeDocumento } from './documentos.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar';

/** Ajustar el saldo libre de una nota (`ajustes.crear`) y anular un ajuste (`ajustes.anular`). */
export function rutasDeAjustes(controlador: AjustesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(`${RUTA}/documentos/:documentoId/ajustes`, {
      schema: { tags, params: esquemaParamsDeDocumento, body: esquemaAjustarSaldo },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.ajustes.crear' }),
      handler: controlador.ajustar,
    });
    app.post(`${RUTA}/ajustes/:ajusteId/anular`, {
      schema: { tags, params: esquemaParamsDeAjuste, body: esquemaAnularAjuste },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.ajustes.anular' }),
      handler: controlador.anular,
    });
  };
}
