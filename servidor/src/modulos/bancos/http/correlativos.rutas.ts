import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CorrelativosControlador } from './correlativos.controlador.js';
import { esquemaFiltroDeCorrelativos } from './correlativos.esquemas-http.js';

const RUTA = '/bancos/correlativos';
/** Solo exportar (es reporte); comparte el permiso de exportar del reporte de movimientos. */
const EN_EXCEL = { ruta: RUTA, archivo: 'correlativos', permisos: { exportar: 'bancos.movimientos.exportar' } };

/** Reporte de correlativos: los huecos de la numeración, explicados con la auditoría. Es de solo lectura. */
export function rutasCorrelativos(
  controlador: CorrelativosControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: ['Bancos'], querystring: esquemaFiltroDeCorrelativos },
      preHandler: proteger({ permiso: 'bancos.movimientos.ver' }),
      handler: controlador.reporte,
    });
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio, filtro: esquemaFiltroDeCorrelativos });
  };
}
