import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ChequesCaducosControlador } from './cheques-caducos.controlador.js';
import {
  esquemaAnulacionEnLoteDeChequesCaducos,
  esquemaFiltroDeChequesCaducos,
} from './cheques-caducos.esquemas-http.js';

const RUTA = '/bancos/cheques-caducos';
/** Solo exportar (es reporte, no se importa). */
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'cheques-caducos',
  permisos: { exportar: 'bancos.cheques-caducos.exportar' },
};

/** Reporte de cheques emitidos y sin cobrar con más meses que el plazo, y su anulación en lote (todo o nada). */
export function rutasChequesCaducos(
  controlador: ChequesCaducosControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: ['Bancos'], querystring: esquemaFiltroDeChequesCaducos },
      preHandler: proteger({ permiso: 'bancos.cheques-caducos.ver' }),
      handler: controlador.reporte,
    });
    app.post('/bancos/cheques/anular-en-lote', {
      schema: { tags: ['Bancos'], body: esquemaAnulacionEnLoteDeChequesCaducos },
      preHandler: proteger({ permiso: 'bancos.cheques-caducos.anular' }),
      handler: controlador.anularEnLote,
    });
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio, filtro: esquemaFiltroDeChequesCaducos });
  };
}
