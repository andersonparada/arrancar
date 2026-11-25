import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { DocumentoAnuladoControlador } from './documento-anulado.controlador.js';
import {
  esquemaConMotivoDelDocumento,
  esquemaDisputaDelDocumento,
  esquemaParamsDeDocumentoAnulado,
  esquemaReemplazoDelDocumento,
  esquemaSalidaDelDocumento,
} from './documento-anulado.esquemas-http.js';

const tags = ['Caja chica'];
const RUTA = '/caja-chica/comprobantes/:id/documento-anulado';

/**
 * Qué hacer con un documento que su emisor anuló después de gastar (`comprobantes.resolver`): reemplazarlo por otra FEL,
 * resolverlo con devolución, cobro o sin recuperación, y llevar la disputa de la anulación.
 */
export function rutasDeDocumentoAnulado(controlador: DocumentoAnuladoControlador): FastifyPluginAsyncZod {
  return async (app) => {
    salidas(app, controlador);
    disputa(app, controlador);
  };
}

const params = esquemaParamsDeDocumentoAnulado;
const resolver = () => proteger({ permiso: 'caja-chica.comprobantes.resolver' });

function salidas(app: FastifyInstance, controlador: DocumentoAnuladoControlador): void {
  app.post(`${RUTA}/resolver`, {
    schema: { tags, params, body: esquemaSalidaDelDocumento },
    preHandler: resolver(),
    handler: controlador.resolver,
  });
  app.post(`${RUTA}/reemplazar`, {
    schema: { tags, params, body: esquemaReemplazoDelDocumento },
    preHandler: resolver(),
    handler: controlador.reemplazar,
  });
}

function disputa(app: FastifyInstance, controlador: DocumentoAnuladoControlador): void {
  app.post(`${RUTA}/disputa`, {
    schema: { tags, params, body: esquemaDisputaDelDocumento },
    preHandler: resolver(),
    handler: controlador.ponerEnDisputa,
  });
  app.post(`${RUTA}/retirar-disputa`, {
    schema: { tags, params, body: esquemaConMotivoDelDocumento },
    preHandler: resolver(),
    handler: controlador.quitarDeDisputa,
  });
}
