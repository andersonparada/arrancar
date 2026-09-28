import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import {
  esquemaChequera,
  esquemaFiltroDeCheques,
  esquemaParamsChequera,
  esquemaParamsCuentaBancariaDeChequeras,
} from './chequeras.esquemas-http.js';
import type { ChequerasControlador } from './chequeras.controlador.js';

const etiquetas = ['Bancos'];
const RUTA_CUENTA = '/bancos/cuentas-bancarias/:cuentaBancariaId/chequeras';
const RUTA = '/bancos/chequeras';

/** Chequeras: se ven y se crean desde la ficha de la cuenta bancaria; sin Excel (es administración de la cuenta). */
export function rutasChequeras(controlador: ChequerasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'bancos.cuentas-bancarias.ver' });
    const gestionar = proteger({ permiso: 'bancos.chequeras.gestionar' });
    const conCuenta = { tags: etiquetas, params: esquemaParamsCuentaBancariaDeChequeras };
    const conId = { tags: etiquetas, params: esquemaParamsChequera };

    app.get(RUTA_CUENTA, { schema: conCuenta, preHandler: ver, handler: controlador.listar });
    app.post(RUTA_CUENTA, {
      schema: { ...conCuenta, body: esquemaChequera },
      preHandler: gestionar,
      handler: controlador.crear,
    });
    app.post(`${RUTA}/:chequeraId/inactivar`, { schema: conId, preHandler: gestionar, handler: controlador.inactivar });
    app.post(`${RUTA}/:chequeraId/reactivar`, { schema: conId, preHandler: gestionar, handler: controlador.reactivar });
    app.get(`${RUTA}/:chequeraId/cheques`, {
      schema: { ...conId, querystring: esquemaFiltroDeCheques },
      preHandler: ver,
      handler: controlador.listarCheques,
    });
  };
}
