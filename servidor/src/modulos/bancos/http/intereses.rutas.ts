import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { InteresesControlador } from './intereses.controlador.js';
import { esquemaFiltroDeIntereses } from './intereses.esquemas-http.js';

const RUTA = '/bancos/intereses-y-retenciones';

/** Intereses y retenciones: reporte de solo lectura con su Excel, cada uno con su permiso. */
export function rutasIntereses(
  controlador: InteresesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: ['Bancos'], querystring: esquemaFiltroDeIntereses },
      preHandler: proteger({ permiso: 'bancos.intereses.ver' }),
      handler: controlador.reporte,
    });
    rutasDeIntercambio(app, {
      ruta: RUTA,
      archivo: 'intereses-y-retenciones',
      permisos: { exportar: 'bancos.intereses.exportar' },
      intercambio,
      filtro: esquemaFiltroDeIntereses,
    });
  };
}
