import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CorrelativosDeChequesControlador } from './correlativos-de-cheques.controlador.js';
import {
  esquemaFiltroDeCorrelativosDeCheques,
  esquemaParamsCorrelativosDeCheques,
} from './correlativos-de-cheques.esquemas-http.js';

const RUTA = '/bancos/chequeras/:chequeraId/correlativos';

/** «Correlativos de cheques»: solo lectura, con su Excel y sus permisos propios. */
export function rutasCorrelativosDeCheques(
  controlador: CorrelativosDeChequesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: {
        tags: ['Bancos'],
        params: esquemaParamsCorrelativosDeCheques,
        querystring: esquemaFiltroDeCorrelativosDeCheques,
      },
      preHandler: proteger({ permiso: 'bancos.correlativos-de-cheques.ver' }),
      handler: controlador.reporteDeCorrelativos,
    });
    rutasDeIntercambio(app, {
      ruta: RUTA,
      archivo: 'correlativos-de-cheques',
      permisos: { exportar: 'bancos.correlativos-de-cheques.exportar' },
      intercambio,
      filtro: esquemaFiltroDeCorrelativosDeCheques,
      params: esquemaParamsCorrelativosDeCheques,
    });
  };
}
