import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod, ZodTypeProvider } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { AccionesControlador } from './acciones.controlador.js';
import {
  esquemaAutorizarDocumentos,
  esquemaCambiarVencimiento,
  esquemaCompletarDocumentos,
  esquemaDesautorizarDocumento,
} from './acciones.esquemas-http.js';
import { esquemaParamsDeDocumento } from './documentos.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/documentos';
const registrar = () => proteger({ permiso: 'cuentas-por-pagar.documentos.registrar' });
const autorizar = () => proteger({ permiso: 'cuentas-por-pagar.documentos.autorizar' });

/**
 * Completar y cambiar el vencimiento piden `documentos.registrar`; autorizar y desautorizar, `documentos.autorizar`
 * (autorizar lo propio, además, `autorizar-propios`: lo revisa el caso de uso). Completar y autorizar son por lote.
 */
export function rutasDeAcciones(controlador: AccionesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasPorLote(app, controlador);
    rutasPorDocumento(app, controlador);
  };
}

function rutasPorLote(app: FastifyInstance, controlador: AccionesControlador): void {
  const zod = app.withTypeProvider<ZodTypeProvider>();
  zod.post(`${RUTA}/registrar`, {
    schema: { tags, body: esquemaCompletarDocumentos },
    preHandler: registrar(),
    handler: controlador.completar,
  });
  zod.post(`${RUTA}/autorizar`, {
    schema: { tags, body: esquemaAutorizarDocumentos },
    preHandler: autorizar(),
    handler: controlador.autorizar,
  });
}

function rutasPorDocumento(app: FastifyInstance, controlador: AccionesControlador): void {
  const zod = app.withTypeProvider<ZodTypeProvider>();
  zod.post(`${RUTA}/:documentoId/desautorizar`, {
    schema: { tags, params: esquemaParamsDeDocumento, body: esquemaDesautorizarDocumento },
    preHandler: autorizar(),
    handler: controlador.desautorizar,
  });
  zod.patch(`${RUTA}/:documentoId`, {
    schema: { tags, params: esquemaParamsDeDocumento, body: esquemaCambiarVencimiento },
    preHandler: registrar(),
    handler: controlador.cambiarVencimiento,
  });
}
