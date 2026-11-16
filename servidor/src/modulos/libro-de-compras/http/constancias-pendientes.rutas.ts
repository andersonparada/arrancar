import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ConstanciasPendientesControlador } from './constancias-pendientes.controlador.js';
import { esquemaFiltroDeConstanciasPendientes } from './constancias-pendientes.esquemas-http.js';

const RUTA = '/libro-de-compras/retenciones/constancias-pendientes';
const PERMISO = 'libro-de-compras.retenciones';

/** Constancias pendientes de todos los meses (`retenciones.ver`) y su Excel (`retenciones.exportar`). */
export function rutasDeConstanciasPendientes(
  controlador: ConstanciasPendientesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: ['Libro de compras'], querystring: esquemaFiltroDeConstanciasPendientes },
      preHandler: proteger({ permiso: `${PERMISO}.ver` }),
      handler: controlador.listar,
    });
    rutasDeIntercambio(app, {
      ruta: RUTA,
      archivo: 'constancias-pendientes',
      permisos: { exportar: `${PERMISO}.exportar` },
      intercambio,
      filtro: esquemaFiltroDeConstanciasPendientes,
    });
  };
}
