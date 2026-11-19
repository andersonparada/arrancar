import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { TiposDeCambioControlador } from './tipos-de-cambio.controlador.js';
import { esquemaFiltroDeTiposDeCambio } from './tipos-de-cambio.esquemas-http.js';

const RUTA = '/multimoneda/tipos-de-cambio';

/** «Tipos de cambio»: reporte de solo lectura, con su Excel y sus permisos propios. */
export function rutasTiposDeCambio(
  controlador: TiposDeCambioControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: ['Multimoneda'], querystring: esquemaFiltroDeTiposDeCambio },
      preHandler: proteger({ permiso: 'multimoneda.tipos-de-cambio.ver' }),
      handler: controlador.reporte,
    });
    rutasDeIntercambio(app, {
      ruta: RUTA,
      archivo: 'tipos-de-cambio',
      permisos: { exportar: 'multimoneda.tipos-de-cambio.exportar' },
      intercambio,
      filtro: esquemaFiltroDeTiposDeCambio,
    });
  };
}
