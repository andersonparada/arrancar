import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { BajasControlador } from './bajas.controlador.js';
import { esquemaAnularDocumento } from './bajas.esquemas-http.js';
import { esquemaParamsDeDocumento } from './documentos.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/documentos/:documentoId';

/**
 * Anular y eliminar desde Cuentas por pagar. Cada una pide su permiso de aquí y no el de Libro de compras, aunque también
 * dan de baja el registro de allá.
 */
export function rutasDeBajas(controlador: BajasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(`${RUTA}/anular`, {
      schema: { tags, params: esquemaParamsDeDocumento, body: esquemaAnularDocumento },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.documentos.anular' }),
      handler: controlador.anular,
    });
    app.delete(RUTA, {
      schema: { tags, params: esquemaParamsDeDocumento },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.documentos.eliminar' }),
      handler: controlador.eliminar,
    });
  };
}
