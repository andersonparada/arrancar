import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { GastosControlador } from './gastos.controlador.js';
import {
  esquemaAsignarGastos,
  esquemaBandeja,
  esquemaGastoSinDocumento,
  esquemaParamsDeGasto,
  esquemaQuitarGasto,
} from './gastos.esquemas-http.js';

const tags = ['Cuentas por liquidar'];
const RUTA = '/cuentas-por-liquidar';

/** Las consultas: la bandeja y los gastos de un anticipo (`anticipos.ver`). */
function rutasDeConsulta(app: FastifyInstance, controlador: GastosControlador): void {
  const ver = proteger({ permiso: 'cuentas-por-liquidar.anticipos.ver' });
  app.get(`${RUTA}/bandeja`, {
    schema: { tags, querystring: esquemaBandeja },
    preHandler: ver,
    handler: controlador.bandeja,
  });
  app.get(`${RUTA}/anticipos/:id/gastos`, {
    schema: { tags, params: esquemaParamsDeGasto },
    preHandler: ver,
    handler: controlador.delAnticipo,
  });
}

/** Lo que cambia los gastos: asignar y registrar (`gastos.crear`) y quitar (`gastos.anular`). */
function rutasDeCambio(app: FastifyInstance, controlador: GastosControlador): void {
  const crear = proteger({ permiso: 'cuentas-por-liquidar.gastos.crear' });
  app.post(`${RUTA}/anticipos/:id/gastos/documentos`, {
    schema: { tags, params: esquemaParamsDeGasto, body: esquemaAsignarGastos },
    preHandler: crear,
    handler: controlador.asignar,
  });
  app.post(`${RUTA}/anticipos/:id/gastos/sin-documento`, {
    schema: { tags, params: esquemaParamsDeGasto, body: esquemaGastoSinDocumento },
    preHandler: crear,
    handler: controlador.sinDocumento,
  });
  app.post(`${RUTA}/gastos/:id/quitar`, {
    schema: { tags, params: esquemaParamsDeGasto, body: esquemaQuitarGasto },
    preHandler: proteger({ permiso: 'cuentas-por-liquidar.gastos.anular' }),
    handler: controlador.quitar,
  });
}

/**
 * Los gastos de los anticipos: la bandeja y los gastos de un anticipo (`anticipos.ver`), asignar documentos y registrar un
 * gasto sin documento (`gastos.crear`; con retención, además el permiso de excepción, que revisa el caso de uso según el
 * documento) y quitar un gasto (`gastos.anular`).
 */
export function rutasDeGastos(controlador: GastosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeConsulta(app, controlador);
    rutasDeCambio(app, controlador);
  };
}
