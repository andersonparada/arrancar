import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { SaldosPorCuentaControlador } from './saldos-por-cuenta.controlador.js';
import { esquemaFiltroDeSaldosPorCuenta } from './saldos-por-cuenta.esquemas-http.js';

const RUTA = '/bancos/saldos-por-cuenta';

/** «Saldos por cuenta»: solo lectura, con su Excel y sus permisos propios. */
export function rutasSaldosPorCuenta(
  controlador: SaldosPorCuentaControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: ['Bancos'], querystring: esquemaFiltroDeSaldosPorCuenta },
      preHandler: proteger({ permiso: 'bancos.saldos-por-cuenta.ver' }),
      handler: controlador.reporteDeSaldos,
    });
    rutasDeIntercambio(app, {
      ruta: RUTA,
      archivo: 'saldos-por-cuenta',
      permisos: { exportar: 'bancos.saldos-por-cuenta.exportar' },
      intercambio,
      filtro: esquemaFiltroDeSaldosPorCuenta,
    });
  };
}
