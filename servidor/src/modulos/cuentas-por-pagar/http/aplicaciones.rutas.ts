import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { AplicacionesControlador } from './aplicaciones.controlador.js';
import {
  esquemaAplicarNota,
  esquemaParamsDeAplicacion,
  esquemaQuitarAplicacion,
} from './aplicaciones.esquemas-http.js';
import { esquemaParamsDeDocumento } from './documentos.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar';
const aplicarNotas = () => proteger({ permiso: 'cuentas-por-pagar.documentos.aplicar-notas' });

/**
 * Aplicar el saldo libre de una nota a otros cargos del proveedor y quitar esas aplicaciones. Aplicar y quitar piden
 * `documentos.aplicar-notas`; ver los cargos que se ofrecen, `documentos.ver`.
 */
export function rutasDeAplicaciones(controlador: AplicacionesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(`${RUTA}/documentos/:documentoId/cargos-para-aplicar`, {
      schema: { tags, params: esquemaParamsDeDocumento },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.documentos.ver' }),
      handler: controlador.cargosParaAplicar,
    });
    app.post(`${RUTA}/documentos/:documentoId/aplicaciones`, {
      schema: { tags, params: esquemaParamsDeDocumento, body: esquemaAplicarNota },
      preHandler: aplicarNotas(),
      handler: controlador.aplicar,
    });
    app.delete(`${RUTA}/aplicaciones/:aplicacionId`, {
      schema: { tags, params: esquemaParamsDeAplicacion, body: esquemaQuitarAplicacion },
      preHandler: aplicarNotas(),
      handler: controlador.quitar,
    });
  };
}
