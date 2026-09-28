import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { MovimientosControlador } from './movimientos.controlador.js';
import {
  esquemaAnulacion,
  esquemaFiltroDeMovimientos,
  esquemaMovimiento,
  esquemaParamsMovimiento,
} from './movimientos.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Bancos'];
const RUTA = '/bancos/movimientos';
const conId = { tags: etiquetas, params: esquemaParamsMovimiento };
/** Solo importar (así se cargan los saldos iniciales): lo registrado se consulta en los reportes. */
const EN_EXCEL = { ruta: RUTA, archivo: 'movimientos', permisos: { importar: 'bancos.movimientos.importar' } };

function rutasDeLectura(app: Aplicacion, controlador: MovimientosControlador) {
  const ver = proteger({ permiso: 'bancos.movimientos.ver' });
  app.get(RUTA, {
    schema: { tags: etiquetas, querystring: esquemaFiltroDeMovimientos },
    preHandler: ver,
    handler: controlador.listar,
  });
  app.get(`${RUTA}/:movimientoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
}

/** Registrar y corregir con `gestionar`; anular tiene su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: MovimientosControlador) {
  const gestionar = proteger({ permiso: 'bancos.movimientos.gestionar' });
  const cuerpo = { tags: etiquetas, body: esquemaMovimiento };
  app.post(RUTA, { schema: cuerpo, preHandler: gestionar, handler: controlador.crear });
  app.put(`${RUTA}/:movimientoId`, {
    schema: { ...conId, body: esquemaMovimiento },
    preHandler: gestionar,
    handler: controlador.actualizar,
  });
  app.post(`${RUTA}/:movimientoId/anular`, {
    schema: { ...conId, body: esquemaAnulacion },
    preHandler: proteger({ permiso: 'bancos.movimientos.anular' }),
    handler: controlador.anular,
  });
}

export function rutasMovimientos(
  controlador: MovimientosControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLectura(app, controlador);
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
