import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CuadreDeSaldosInicialesControlador } from './cuadre-de-saldos-iniciales.controlador.js';

const RUTA = '/cuentas-por-pagar/saldos-iniciales/cuadre';
const PERMISOS = 'cuentas-por-pagar.saldos-iniciales';

/** El cuadre de la carga inicial: se ve con `ver` y se exporta con `exportar` (es reporte, no se importa). */
export function rutasDelCuadreDeSaldosIniciales(
  controlador: CuadreDeSaldosInicialesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: ['Cuentas por pagar'] },
      preHandler: proteger({ permiso: `${PERMISOS}.ver` }),
      handler: controlador.cuadre,
    });
    rutasDeIntercambio(app, {
      ruta: RUTA,
      archivo: 'cuadre-saldos-iniciales',
      permisos: { exportar: `${PERMISOS}.exportar` },
      intercambio,
    });
  };
}
