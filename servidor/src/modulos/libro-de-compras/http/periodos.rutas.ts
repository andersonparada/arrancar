import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { PeriodosControlador } from './periodos.controlador.js';
import {
  esquemaApagarControl,
  esquemaConsultaDePeriodos,
  esquemaDeclaracion,
  esquemaParamsDePeriodo,
  esquemaReapertura,
} from './periodos.esquemas-http.js';

const tags = ['Libro de compras'];
const RUTA = '/libro-de-compras/periodos';
const PERMISO = 'libro-de-compras.periodos';
const params = esquemaParamsDePeriodo;

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

function rutasDeConsulta(app: Aplicacion, controlador: PeriodosControlador): void {
  const ver = proteger({ permiso: `${PERMISO}.ver` });
  app.get(RUTA, {
    schema: { tags, querystring: esquemaConsultaDePeriodos },
    preHandler: ver,
    handler: controlador.listar,
  });
  app.get(`${RUTA}/:periodo`, { schema: { tags, params }, preHandler: ver, handler: controlador.obtener });
}

function rutasDeCambios(app: Aplicacion, controlador: PeriodosControlador): void {
  app.post(`${RUTA}/:periodo/declarar`, {
    schema: { tags, params, body: esquemaDeclaracion },
    preHandler: proteger({ permiso: `${PERMISO}.declarar` }),
    handler: controlador.declarar,
  });
  app.post(`${RUTA}/:periodo/reabrir`, {
    schema: { tags, params, body: esquemaReapertura },
    preHandler: proteger({ permiso: `${PERMISO}.reabrir` }),
    handler: controlador.reabrir,
  });
}

function rutasDelControl(app: Aplicacion, controlador: PeriodosControlador): void {
  app.post(`${RUTA}/control/encender`, {
    schema: { tags },
    preHandler: proteger({ permiso: `${PERMISO}.declarar` }),
    handler: controlador.encenderControl,
  });
  app.post(`${RUTA}/control/apagar`, {
    schema: { tags, body: esquemaApagarControl },
    preHandler: proteger({ permiso: `${PERMISO}.reabrir` }),
    handler: controlador.apagarControl,
  });
}

/**
 * Ver los períodos y su historial exige `periodos.ver`; declarar y encender el bloqueo, `periodos.declarar`; reabrir
 * y apagar el bloqueo, `periodos.reabrir`.
 */
export const rutasDePeriodos =
  (controlador: PeriodosControlador): FastifyPluginAsyncZod =>
  async (app) => {
    rutasDeConsulta(app, controlador);
    rutasDeCambios(app, controlador);
    rutasDelControl(app, controlador);
  };
