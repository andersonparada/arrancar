import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { DatosDeEmpresaControlador } from './datos-de-empresa.controlador.js';
import {
  esquemaDatosFiscales,
  esquemaFechaDeInicio,
  esquemaReaperturaDeCarga,
} from './datos-de-empresa.esquemas-http.js';
import { esquemaParamsEmpresa as params } from './empresas.esquemas-http.js';

const tags = ['Empresas'];

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

function rutasDeDatosFiscales(app: Aplicacion, controlador: DatosDeEmpresaControlador) {
  app.get('/empresas/:empresaId/datos-fiscales', {
    schema: { tags, params },
    preHandler: proteger({ permiso: 'empresas.ver' }),
    handler: controlador.obtenerDatosFiscales,
  });
  app.put('/empresas/:empresaId/datos-fiscales', {
    schema: { tags, params, body: esquemaDatosFiscales },
    preHandler: proteger({ permiso: 'empresas.editar' }),
    handler: controlador.guardarDatosFiscales,
  });
}

function rutasDeLaCargaInicial(app: Aplicacion, controlador: DatosDeEmpresaControlador) {
  app.get('/empresas/:empresaId/carga-inicial', {
    schema: { tags, params },
    preHandler: proteger({ permiso: 'empresas.ver' }),
    handler: controlador.obtenerCargaInicial,
  });
  app.put('/empresas/:empresaId/carga-inicial', {
    schema: { tags, params, body: esquemaFechaDeInicio },
    preHandler: proteger({ permiso: 'empresas.editar' }),
    handler: controlador.establecerFechaDeInicio,
  });
  app.post('/empresas/:empresaId/carga-inicial/cerrar', {
    schema: { tags, params },
    preHandler: proteger({ permiso: 'empresas.carga-inicial.cerrar' }),
    handler: controlador.cerrarCargaInicial,
  });
  app.post('/empresas/:empresaId/carga-inicial/reabrir', {
    schema: { tags, params, body: esquemaReaperturaDeCarga },
    preHandler: proteger({ permiso: 'empresas.carga-inicial.reabrir' }),
    handler: controlador.reabrirCargaInicial,
  });
}

/** Datos fiscales y carga inicial de una empresa de la cuenta (no tiene por qué ser la activa). */
export function rutasDeDatosDeEmpresa(controlador: DatosDeEmpresaControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeDatosFiscales(app, controlador);
    rutasDeLaCargaInicial(app, controlador);
  };
}
