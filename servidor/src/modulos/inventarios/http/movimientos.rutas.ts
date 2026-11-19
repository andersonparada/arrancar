import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { MovimientosControlador } from './movimientos.controlador.js';
import {
  esquemaAnulacion,
  esquemaEntrada,
  esquemaFiltrosDeDocumentos,
  esquemaFiltrosDeExistencias,
  esquemaFiltrosDeKardex,
  esquemaMetodo,
  esquemaParamsArticulo,
  esquemaParamsDocumento,
  esquemaSalida,
} from './movimientos.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const tags = ['Inventarios'];
const conId = { tags, params: esquemaParamsDocumento };

/** Entradas y salidas: crear y anular, cada una con su permiso. */
function rutasDeDocumentos(app: Aplicacion, controlador: MovimientosControlador) {
  app.post('/inventarios/entradas', {
    schema: { tags, body: esquemaEntrada },
    preHandler: proteger({ permiso: 'inventarios.entradas.crear' }),
    handler: controlador.registrarEntrada,
  });
  app.post('/inventarios/entradas/:documentoId/anular', {
    schema: { ...conId, body: esquemaAnulacion },
    preHandler: proteger({ permiso: 'inventarios.entradas.anular' }),
    handler: controlador.anularEntrada,
  });
  app.post('/inventarios/salidas', {
    schema: { tags, body: esquemaSalida },
    preHandler: proteger({ permiso: 'inventarios.salidas.crear' }),
    handler: controlador.registrarSalida,
  });
  app.post('/inventarios/salidas/:documentoId/anular', {
    schema: { ...conId, body: esquemaAnulacion },
    preHandler: proteger({ permiso: 'inventarios.salidas.anular' }),
    handler: controlador.anularSalida,
  });
}

/** Las lecturas del kardex: existencias, kardex por artículo y documentos. */
function rutasDeConsulta(app: Aplicacion, controlador: MovimientosControlador) {
  const ver = proteger({ permiso: 'inventarios.existencias.ver' });
  app.get('/inventarios/existencias', {
    schema: { tags, querystring: esquemaFiltrosDeExistencias },
    preHandler: ver,
    handler: controlador.listarExistencias,
  });
  app.get('/inventarios/articulos/:articuloId/kardex', {
    schema: { tags, params: esquemaParamsArticulo, querystring: esquemaFiltrosDeKardex },
    preHandler: ver,
    handler: controlador.kardex,
  });
  app.get('/inventarios/documentos', {
    schema: { tags, querystring: esquemaFiltrosDeDocumentos },
    preHandler: ver,
    handler: controlador.listarDocumentos,
  });
  app.get('/inventarios/documentos/:documentoId', {
    schema: conId,
    preHandler: ver,
    handler: controlador.obtenerDocumento,
  });
}

export function rutasMovimientos(controlador: MovimientosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeDocumentos(app, controlador);
    rutasDeConsulta(app, controlador);
    app.get('/inventarios/metodo-de-costeo', {
      schema: { tags },
      preHandler: proteger({ permiso: 'inventarios.metodo-de-costeo.ver' }),
      handler: controlador.obtenerPolitica,
    });
    app.post('/inventarios/metodo-de-costeo', {
      schema: { tags, body: esquemaMetodo },
      preHandler: proteger({ permiso: 'inventarios.metodo-de-costeo.elegir' }),
      handler: controlador.elegirMetodo,
    });
  };
}
