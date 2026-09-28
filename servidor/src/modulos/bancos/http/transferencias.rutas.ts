import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { TransferenciasControlador } from './transferencias.controlador.js';
import {
  esquemaAnulacionDeTransferencia,
  esquemaParamsTransferencia,
  esquemaTransferencia,
} from './transferencias.esquemas-http.js';

const etiquetas = ['Bancos'];
const RUTA = '/bancos/transferencias';

/** Sin Excel (es operación) y sin pantalla propia: se registran y se anulan desde Movimientos. */
export function rutasTransferencias(controlador: TransferenciasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const conId = { tags: etiquetas, params: esquemaParamsTransferencia };
    app.post(RUTA, {
      schema: { tags: etiquetas, body: esquemaTransferencia },
      preHandler: proteger({ permiso: 'bancos.transferencias.gestionar' }),
      handler: controlador.registrar,
    });
    app.get(`${RUTA}/:transferenciaId`, {
      schema: conId,
      preHandler: proteger({ permiso: 'bancos.movimientos.ver' }),
      handler: controlador.obtener,
    });
    app.post(`${RUTA}/:transferenciaId/anular`, {
      schema: { ...conId, body: esquemaAnulacionDeTransferencia },
      preHandler: proteger({ permiso: 'bancos.transferencias.anular' }),
      handler: controlador.anular,
    });
  };
}
