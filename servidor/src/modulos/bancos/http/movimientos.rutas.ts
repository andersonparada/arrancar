import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { MovimientosControlador } from './movimientos.controlador.js';
import { esquemaFiltroDeMovimientos, esquemaParamsMovimiento } from './movimientos.esquemas-http.js';

const etiquetas = ['Bancos'];
const RUTA = '/bancos/movimientos';
/** Solo exportar (es reporte): lo registrado se captura en Notas, Transferencias y el saldo inicial de la cuenta. */
const EN_EXCEL = { ruta: RUTA, archivo: 'movimientos', permisos: { exportar: 'bancos.movimientos.exportar' } };

/** Movimientos queda de solo lectura: el reporte (con su saldo corrido) y una nota o un saldo inicial por id. */
export function rutasMovimientos(
  controlador: MovimientosControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'bancos.movimientos.ver' });
    app.get(`${RUTA}/reporte`, {
      schema: { tags: etiquetas, querystring: esquemaFiltroDeMovimientos },
      preHandler: ver,
      handler: controlador.reporte,
    });
    app.get(`${RUTA}/:movimientoId`, {
      schema: { tags: etiquetas, params: esquemaParamsMovimiento },
      preHandler: ver,
      handler: controlador.obtener,
    });
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio, filtro: esquemaFiltroDeMovimientos });
  };
}
