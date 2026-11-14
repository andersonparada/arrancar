import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ContrasenasControlador } from './contrasenas.controlador.js';
import {
  esquemaContrasena,
  esquemaDisponibles,
  esquemaDocumentosAgregados,
  esquemaEdicionDeContrasena,
  esquemaFiltroDeContrasenas,
  esquemaParamsDeContrasena,
  esquemaParamsDeDocumentoDeContrasena,
  esquemaQuitarDocumento,
} from './contrasenas.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/contrasenas';

/** Contraseñas de pago: lista, ficha y documentos disponibles piden `contrasenas.ver`; crear, `contrasenas.crear`; cambiar la fecha,
 * las observaciones o los documentos, `contrasenas.editar`. */
export function rutasDeContrasenas(controlador: ContrasenasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeConsulta(app, controlador);
    app.post(RUTA, {
      schema: { tags, body: esquemaContrasena },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.contrasenas.crear' }),
      handler: controlador.crear,
    });
    rutasDeEdicion(app, controlador);
  };
}

function rutasDeConsulta(app: FastifyInstance, controlador: ContrasenasControlador): void {
  const ver = proteger({ permiso: 'cuentas-por-pagar.contrasenas.ver' });
  app.get(RUTA, {
    schema: { tags, querystring: esquemaFiltroDeContrasenas },
    preHandler: ver,
    handler: controlador.listar,
  });
  // La ruta fija va antes que `/:id`.
  app.get(`${RUTA}/disponibles`, {
    schema: { tags, querystring: esquemaDisponibles },
    preHandler: ver,
    handler: controlador.disponibles,
  });
  app.get(`${RUTA}/:id`, {
    schema: { tags, params: esquemaParamsDeContrasena },
    preHandler: ver,
    handler: controlador.obtener,
  });
}

function rutasDeEdicion(app: FastifyInstance, controlador: ContrasenasControlador): void {
  const editar = proteger({ permiso: 'cuentas-por-pagar.contrasenas.editar' });
  app.patch(`${RUTA}/:id`, {
    schema: { tags, params: esquemaParamsDeContrasena, body: esquemaEdicionDeContrasena },
    preHandler: editar,
    handler: controlador.editar,
  });
  app.post(`${RUTA}/:id/documentos`, {
    schema: { tags, params: esquemaParamsDeContrasena, body: esquemaDocumentosAgregados },
    preHandler: editar,
    handler: controlador.agregarDocumentos,
  });
  app.delete(`${RUTA}/:id/documentos/:documentoId`, {
    schema: { tags, params: esquemaParamsDeDocumentoDeContrasena, body: esquemaQuitarDocumento },
    preHandler: editar,
    handler: controlador.quitarDocumento,
  });
}
