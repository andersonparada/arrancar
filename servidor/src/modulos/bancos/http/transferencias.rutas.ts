import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { TransferenciasControlador } from './transferencias.controlador.js';
import {
  esquemaAnulacionDeTransferencia,
  esquemaFiltroDeTransferencias,
  esquemaParamsTransferencia,
  esquemaTransferencia,
} from './transferencias.esquemas-http.js';

const etiquetas = ['Bancos'];
const RUTA = '/bancos/transferencias';

/** Sin Excel (es operación): su pantalla propia lista, registra y anula. */
export function rutasTransferencias(controlador: TransferenciasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const conId = { tags: etiquetas, params: esquemaParamsTransferencia };
    app.get(RUTA, {
      schema: { tags: etiquetas, querystring: esquemaFiltroDeTransferencias },
      preHandler: proteger({ permiso: 'bancos.transferencias.ver' }),
      handler: controlador.listar,
    });
    app.post(RUTA, {
      schema: { tags: etiquetas, body: esquemaTransferencia },
      preHandler: proteger({ permiso: 'bancos.transferencias.gestionar' }),
      handler: controlador.registrar,
    });
    app.get(`${RUTA}/:transferenciaId`, {
      schema: conId,
      preHandler: proteger({ permiso: 'bancos.transferencias.ver' }),
      handler: controlador.obtener,
    });
    app.post(`${RUTA}/:transferenciaId/anular`, {
      schema: { ...conId, body: esquemaAnulacionDeTransferencia },
      preHandler: proteger({ permiso: 'bancos.transferencias.anular' }),
      handler: controlador.anular,
    });
  };
}
