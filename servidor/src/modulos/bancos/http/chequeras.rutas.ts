import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import {
  esquemaChequera,
  esquemaFiltroDeCheques,
  esquemaFiltroDeChequeras,
  esquemaParamsChequera,
  esquemaParamsCuentaBancariaDeChequeras,
} from './chequeras.esquemas-http.js';
import type { ChequerasControlador } from './chequeras.controlador.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Bancos'];
const RUTA_CUENTA = '/bancos/cuentas-bancarias/:cuentaBancariaId/chequeras';
const RUTA = '/bancos/chequeras';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'chequeras',
  permisos: { importar: 'bancos.chequeras.importar', exportar: 'bancos.chequeras.exportar' },
};

/** Ver todas las chequeras de la empresa y las de una cuenta, y crear, inactivar o reactivar una. */
function rutasDeLectura(app: Aplicacion, controlador: ChequerasControlador) {
  const ver = proteger({ permiso: 'bancos.chequeras.ver' });
  const crear = proteger({ permiso: 'bancos.chequeras.crear' });
  const editar = proteger({ permiso: 'bancos.chequeras.editar' });
  const conCuenta = { tags: etiquetas, params: esquemaParamsCuentaBancariaDeChequeras };
  const conId = { tags: etiquetas, params: esquemaParamsChequera };

  app.get(RUTA, {
    schema: { tags: etiquetas, querystring: esquemaFiltroDeChequeras },
    preHandler: ver,
    handler: controlador.listarTodas,
  });
  app.get(RUTA_CUENTA, { schema: conCuenta, preHandler: ver, handler: controlador.listar });
  app.post(RUTA_CUENTA, {
    schema: { ...conCuenta, body: esquemaChequera },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.post(`${RUTA}/:chequeraId/inactivar`, { schema: conId, preHandler: editar, handler: controlador.inactivar });
  app.post(`${RUTA}/:chequeraId/reactivar`, { schema: conId, preHandler: editar, handler: controlador.reactivar });
  app.get(`${RUTA}/:chequeraId/cheques`, {
    schema: { ...conId, querystring: esquemaFiltroDeCheques },
    preHandler: ver,
    handler: controlador.listarCheques,
  });
}

/**
 * Chequeras: se ven y se crean también desde la ficha de la cuenta bancaria,
 * pero "Chequeras" es su propia pantalla de administración, con Excel.
 */
export function rutasChequeras(
  controlador: ChequerasControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLectura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
