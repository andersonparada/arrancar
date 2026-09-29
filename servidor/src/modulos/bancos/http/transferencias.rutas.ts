import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { TransferenciasControlador } from './transferencias.controlador.js';
import {
  esquemaAnulacionDeTransferencia,
  esquemaEliminacionDeTransferencia,
  esquemaFiltroDeTransferencias,
  esquemaParamsTransferencia,
  esquemaTransferencia,
} from './transferencias.esquemas-http.js';

const etiquetas = ['Bancos'];
const RUTA = '/bancos/transferencias';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const conId = { tags: etiquetas, params: esquemaParamsTransferencia };

function rutasDeLectura(app: Aplicacion, controlador: TransferenciasControlador) {
  const ver = proteger({ permiso: 'bancos.transferencias.ver' });
  app.get(RUTA, {
    schema: { tags: etiquetas, querystring: esquemaFiltroDeTransferencias },
    preHandler: ver,
    handler: controlador.listar,
  });
  app.get(`${RUTA}/:transferenciaId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
}

/** Registrar con `crear`; anular y eliminar tienen su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: TransferenciasControlador) {
  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaTransferencia },
    preHandler: proteger({ permiso: 'bancos.transferencias.crear' }),
    handler: controlador.registrar,
  });
  app.post(`${RUTA}/:transferenciaId/anular`, {
    schema: { ...conId, body: esquemaAnulacionDeTransferencia },
    preHandler: proteger({ permiso: 'bancos.transferencias.anular' }),
    handler: controlador.anular,
  });
  app.delete(`${RUTA}/:transferenciaId`, {
    schema: { ...conId, body: esquemaEliminacionDeTransferencia },
    preHandler: proteger({ permiso: 'bancos.transferencias.eliminar' }),
    handler: controlador.eliminar,
  });
}

/** Sin Excel (es operación): su pantalla propia lista, registra, anula y elimina. */
export function rutasTransferencias(controlador: TransferenciasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLectura(app, controlador);
    rutasDeEscritura(app, controlador);
  };
}
