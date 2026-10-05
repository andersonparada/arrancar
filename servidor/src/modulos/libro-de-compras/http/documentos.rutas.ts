import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { DocumentosControlador } from './documentos.controlador.js';
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
