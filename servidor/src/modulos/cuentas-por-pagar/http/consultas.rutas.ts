import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ConsultasControlador } from './consultas.controlador.js';
import {
  esquemaFiltroDeDocumentos,
  esquemaParamsDeDocumento,
  esquemaParamsDeProveedor,
} from './documentos.esquemas-http.js';

const tags = ['Cuentas por pagar'];

/** Bandeja, lista, ficha, proveedores con documentos y saldo del proveedor: de solo lectura, con el permiso de ver documentos. */
export function rutasDeConsultas(controlador: ConsultasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'cuentas-por-pagar.documentos.ver' });
    app.get('/cuentas-por-pagar/bandeja', { schema: { tags }, preHandler: ver, handler: controlador.bandeja });
    app.get('/cuentas-por-pagar/documentos', {
      schema: { tags, querystring: esquemaFiltroDeDocumentos },
      preHandler: ver,
      handler: controlador.listar,
    });
    app.get('/cuentas-por-pagar/documentos/:documentoId', {
      schema: { tags, params: esquemaParamsDeDocumento },
      preHandler: ver,
      handler: controlador.obtener,
    });
    app.get('/cuentas-por-pagar/proveedores', { schema: { tags }, preHandler: ver, handler: controlador.proveedores });
    app.get('/cuentas-por-pagar/proveedores/:proveedorId/saldo', {
      schema: { tags, params: esquemaParamsDeProveedor },
      preHandler: ver,
      handler: controlador.saldoDelProveedor,
    });
  };
}
