import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { esquemaAnulacion, esquemaParamsMovimiento } from './movimientos.esquemas-http.js';
import type { SaldosInicialesControlador } from './saldos-iniciales.controlador.js';
import { esquemaFiltroDeSaldosIniciales, esquemaSaldoInicial } from './saldos-iniciales.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Bancos'];
const RUTA = '/bancos/saldos-iniciales';
const conId = { tags: etiquetas, params: esquemaParamsMovimiento };
/** Importar y exportar (es administración): se ve en la ficha de la cuenta y en la lista de cuentas. */
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'saldos-iniciales',
  permisos: { importar: 'bancos.saldos-iniciales.importar', exportar: 'bancos.saldos-iniciales.exportar' },
};

function rutasDeEscritura(app: Aplicacion, controlador: SaldosInicialesControlador) {
  const gestionar = proteger({ permiso: 'bancos.saldos-iniciales.gestionar' });
  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaSaldoInicial },
    preHandler: gestionar,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:movimientoId`, {
    schema: { ...conId, body: esquemaSaldoInicial },
    preHandler: gestionar,
    handler: controlador.actualizar,
  });
  app.post(`${RUTA}/:movimientoId/anular`, {
    schema: { ...conId, body: esquemaAnulacion },
    preHandler: gestionar,
    handler: controlador.anular,
  });
}

/** Se ve con `bancos.cuentas-bancarias.ver` (aparece en la ficha de la cuenta); registrar, corregir y anular con `gestionar`. */
export function rutasSaldosIniciales(
  controlador: SaldosInicialesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: etiquetas, querystring: esquemaFiltroDeSaldosIniciales },
      preHandler: proteger({ permiso: 'bancos.cuentas-bancarias.ver' }),
      handler: controlador.listar,
    });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
