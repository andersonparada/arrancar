import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ImpresionDeChequesControlador } from './impresion-de-cheques.controlador.js';
import {
  esquemaImpresionDeCheques,
  esquemaParamsChequeImpreso,
  esquemaReimpresionDeCheque,
  esquemaVistaDeImpresion,
} from './impresion-de-cheques.esquemas-http.js';

const etiquetas = ['Bancos'];
const RUTA = '/bancos/cheques';

/**
 * Imprimir cheques: la vista previa y la historia con `cheques.ver` (no cambian nada); la primera impresión (también en
 * lote) con `cheques.imprimir` y la reimpresión, que pide motivo, con `cheques.reimprimir`.
 */
export function rutasImpresionDeCheques(controlador: ImpresionDeChequesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(`${RUTA}/impresion`, {
      schema: { tags: etiquetas, querystring: esquemaVistaDeImpresion },
      preHandler: proteger({ permiso: 'bancos.cheques.ver' }),
      handler: controlador.vistaPrevia,
    });
    app.post(`${RUTA}/impresiones`, {
      schema: { tags: etiquetas, body: esquemaImpresionDeCheques },
      preHandler: proteger({ permiso: 'bancos.cheques.imprimir' }),
      handler: controlador.imprimir,
    });
    app.post(`${RUTA}/:chequeId/reimpresiones`, {
      schema: { tags: etiquetas, params: esquemaParamsChequeImpreso, body: esquemaReimpresionDeCheque },
      preHandler: proteger({ permiso: 'bancos.cheques.reimprimir' }),
      handler: controlador.reimprimir,
    });
    app.get(`${RUTA}/:chequeId/impresiones`, {
      schema: { tags: etiquetas, params: esquemaParamsChequeImpreso },
      preHandler: proteger({ permiso: 'bancos.cheques.ver' }),
      handler: controlador.historial,
    });
  };
}
