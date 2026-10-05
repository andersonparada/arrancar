import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { DocumentosControlador } from './documentos.controlador.js';
import {
  esquemaAnulacionDeDocumento,
  esquemaFiltroDeDocumentos,
  esquemaParamsDeDocumento,
} from './documentos.bajas.esquemas-http.js';
import { esquemaDocumento, esquemaParamsDeProveedor } from './documentos.esquemas-http.js';

const tags = ['Libro de compras'];
const RUTA = '/libro-de-compras/documentos';

/**
 * Registro de documentos de compra. Calcular, los destinos y el destino sugerido son parte del formulario de
 * registro, así que exigen el mismo permiso que registrar (`documentos.crear`). Cambiar o quitar una retención
 * propuesta exige además `libro-de-compras.retenciones.ajustar`, que el caso de uso comprueba.
 */
export function rutasDeDocumentos(controlador: DocumentosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const crear = proteger({ permiso: 'libro-de-compras.documentos.crear' });
    rutasDeConsultaYBaja(app, controlador);

    app.post(`${RUTA}/calcular`, {
      schema: { tags, body: esquemaDocumento },
      preHandler: crear,
      handler: controlador.calcular,
    });
    app.post(RUTA, { schema: { tags, body: esquemaDocumento }, preHandler: crear, handler: controlador.registrar });
    app.get('/libro-de-compras/destinos', { schema: { tags }, preHandler: crear, handler: controlador.destinos });
    app.get('/libro-de-compras/proveedores/:proveedorId/destino-sugerido', {
      schema: { tags, params: esquemaParamsDeProveedor },
      preHandler: crear,
      handler: controlador.destinoSugerido,
    });
  };
}

/** La lista y la ficha exigen `documentos.ver`; anular, `documentos.anular`; eliminar, `documentos.eliminar`. */
function rutasDeConsultaYBaja(app: Parameters<FastifyPluginAsyncZod>[0], controlador: DocumentosControlador): void {
  const params = esquemaParamsDeDocumento;
  const ver = proteger({ permiso: 'libro-de-compras.documentos.ver' });
  app.get(RUTA, {
    schema: { tags, querystring: esquemaFiltroDeDocumentos },
    preHandler: ver,
    handler: controlador.listar,
  });
  app.get(`${RUTA}/:documentoId`, { schema: { tags, params }, preHandler: ver, handler: controlador.obtener });
  app.post(`${RUTA}/:documentoId/anular`, {
    schema: { tags, params, body: esquemaAnulacionDeDocumento },
    preHandler: proteger({ permiso: 'libro-de-compras.documentos.anular' }),
    handler: controlador.anular,
  });
  app.delete(`${RUTA}/:documentoId`, {
    schema: { tags, params },
    preHandler: proteger({ permiso: 'libro-de-compras.documentos.eliminar' }),
    handler: controlador.eliminar,
  });
}
