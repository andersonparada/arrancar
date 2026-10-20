import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { EnterosControlador } from './enteros.controlador.js';
import type { RetencionesControlador } from './retenciones.controlador.js';
import {
  esquemaAnularEntero,
  esquemaConstancia,
  esquemaConstanciasEnLote,
  esquemaCorregirEntero,
  esquemaDeAnio,
  esquemaDePorResolver,
  esquemaFiltroDeRetenciones,
  esquemaNuevoEntero,
  esquemaParamsDeEntero,
  esquemaParamsDeRetencion,
  esquemaQuitarConstancia,
  esquemaResolucion,
} from './retenciones.esquemas-http.js';

const tags = ['Libro de compras'];
const RUTA = '/libro-de-compras/retenciones';
const PERMISO = 'libro-de-compras.retenciones';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

function rutasDelReporte(app: Aplicacion, controlador: RetencionesControlador) {
  const ver = proteger({ permiso: `${PERMISO}.ver` });
  app.get(RUTA, {
    schema: { tags, querystring: esquemaFiltroDeRetenciones },
    preHandler: ver,
    handler: controlador.reporte,
  });
  app.get(`${RUTA}/por-resolver`, {
    schema: { tags, querystring: esquemaDePorResolver },
    preHandler: ver,
    handler: controlador.porResolver,
  });
}

function rutasDeConstancias(app: Aplicacion, controlador: RetencionesControlador) {
  const constancias = proteger({ permiso: `${PERMISO}.constancias` });
  const params = esquemaParamsDeRetencion;
  app.post(`${RUTA}/constancias`, {
    schema: { tags, body: esquemaConstanciasEnLote },
    preHandler: constancias,
    handler: controlador.anotarEnLote,
  });
  app.put(`${RUTA}/:id/constancia`, {
    schema: { tags, params, body: esquemaConstancia },
    preHandler: constancias,
    handler: controlador.anotar,
  });
  app.delete(`${RUTA}/:id/constancia`, {
    schema: { tags, params, body: esquemaQuitarConstancia },
    preHandler: constancias,
    handler: controlador.quitar,
  });
  app.put(`${RUTA}/:id/resolucion`, {
    schema: { tags, params, body: esquemaResolucion },
    preHandler: constancias,
    handler: controlador.resolver,
  });
}

function rutasDeEnteros(app: Aplicacion, controlador: EnterosControlador) {
  const enterar = proteger({ permiso: `${PERMISO}.enterar` });
  const params = esquemaParamsDeEntero;
  app.get(`${RUTA}/enteros`, {
    schema: { tags, querystring: esquemaDeAnio },
    preHandler: proteger({ permiso: `${PERMISO}.ver` }),
    handler: controlador.matriz,
  });
  app.post(`${RUTA}/enteros`, {
    schema: { tags, body: esquemaNuevoEntero },
    preHandler: enterar,
    handler: controlador.registrar,
  });
  app.put(`${RUTA}/enteros/:id`, {
    schema: { tags, params, body: esquemaCorregirEntero },
    preHandler: enterar,
    handler: controlador.corregir,
  });
  app.post(`${RUTA}/enteros/:id/anular`, {
    schema: { tags, params, body: esquemaAnularEntero },
    preHandler: enterar,
    handler: controlador.anular,
  });
}

/**
 * Reporte del mes y por resolver (`retenciones.ver`), Excel (`.exportar`), constancias y resolución
 * (`.constancias`) y enteros (`.enterar`; la matriz del año, `.ver`).
 */
export function rutasDeRetenciones(
  controladores: { retenciones: RetencionesControlador; enteros: EnterosControlador },
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDelReporte(app, controladores.retenciones);
    rutasDeIntercambio(app, {
      ruta: RUTA,
      archivo: 'retenciones',
      permisos: { exportar: `${PERMISO}.exportar` },
      intercambio,
      filtro: esquemaFiltroDeRetenciones,
    });
    rutasDeConstancias(app, controladores.retenciones);
    rutasDeEnteros(app, controladores.enteros);
  };
}
