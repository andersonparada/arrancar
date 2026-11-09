import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { SaldosInicialesControlador } from './saldos-iniciales.controlador.js';
import {
  esquemaEliminarSaldoInicial,
  esquemaFiltroDeSaldosIniciales,
  esquemaParamsDeSaldoInicial,
  esquemaSaldoInicial,
} from './saldos-iniciales.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/saldos-iniciales';
const RUTA_DE_UNO = `${RUTA}/:saldoInicialId`;
const permiso = (accion: string) => proteger({ permiso: `cuentas-por-pagar.saldos-iniciales.${accion}` });

/** Las consultas: la lista con la carga inicial y la ficha. */
const rutasDeConsulta =
  (controlador: SaldosInicialesControlador): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(RUTA, {
      schema: { tags, querystring: esquemaFiltroDeSaldosIniciales },
      preHandler: permiso('ver'),
      handler: controlador.listar,
    });
    app.get(RUTA_DE_UNO, {
      schema: { tags, params: esquemaParamsDeSaldoInicial },
      preHandler: permiso('ver'),
      handler: controlador.obtener,
    });
  };

/** Cargar, corregir y eliminar. */
const rutasDeCambio =
  (controlador: SaldosInicialesControlador): FastifyPluginAsyncZod =>
  async (app) => {
    app.post(RUTA, {
      schema: { tags, body: esquemaSaldoInicial },
      preHandler: permiso('crear'),
      handler: controlador.crear,
    });
    app.put(RUTA_DE_UNO, {
      schema: { tags, params: esquemaParamsDeSaldoInicial, body: esquemaSaldoInicial },
      preHandler: permiso('editar'),
      handler: controlador.corregir,
    });
    app.delete(RUTA_DE_UNO, {
      schema: { tags, params: esquemaParamsDeSaldoInicial, body: esquemaEliminarSaldoInicial },
      preHandler: permiso('eliminar'),
      handler: controlador.eliminar,
    });
  };

/** Cargar, corregir, eliminar y consultar los saldos iniciales; cada ruta pide el permiso de su acción. */
export function rutasDeSaldosIniciales(controlador: SaldosInicialesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    await app.register(rutasDeConsulta(controlador));
    await app.register(rutasDeCambio(controlador));
  };
}
