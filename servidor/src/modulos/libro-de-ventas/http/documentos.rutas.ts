import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { DocumentosControlador } from './documentos.controlador.js';
import {
  esquemaAnulacionDeDocumento,
  esquemaDocumento,
  esquemaFiltroDeDocumentos,
  esquemaParamsDeDocumento,
} from './documentos.esquemas-http.js';

const tags = ['Libro de ventas'];
const RUTA = '/libro-de-ventas/documentos';

/**
 * Documentos de venta (§12 del diseño): la lista y la ficha exigen `documentos.ver`; registrar, `documentos.crear`;
 * anular, `documentos.anular`; eliminar, `documentos.eliminar`.
 */
export function rutasDeDocumentos(controlador: DocumentosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeConsulta(app, controlador);
    app.post(RUTA, {
      schema: { tags, body: esquemaDocumento },
      preHandler: proteger({ permiso: 'libro-de-ventas.documentos.crear' }),
      handler: controlador.registrar,
    });
    app.post(`${RUTA}/:documentoId/anular`, {
      schema: { tags, params: esquemaParamsDeDocumento, body: esquemaAnulacionDeDocumento },
      preHandler: proteger({ permiso: 'libro-de-ventas.documentos.anular' }),
      handler: controlador.anular,
    });
    app.delete(`${RUTA}/:documentoId`, {
      schema: { tags, params: esquemaParamsDeDocumento },
      preHandler: proteger({ permiso: 'libro-de-ventas.documentos.eliminar' }),
      handler: controlador.eliminar,
    });
  };
}

/** La lista y la ficha exigen `documentos.ver`. */
function rutasDeConsulta(app: Parameters<FastifyPluginAsyncZod>[0], controlador: DocumentosControlador): void {
  const params = esquemaParamsDeDocumento;
  const ver = proteger({ permiso: 'libro-de-ventas.documentos.ver' });
  app.get(RUTA, {
    schema: { tags, querystring: esquemaFiltroDeDocumentos },
    preHandler: ver,
    handler: controlador.listar,
  });
  app.get(`${RUTA}/:documentoId`, { schema: { tags, params }, preHandler: ver, handler: controlador.obtener });
}
