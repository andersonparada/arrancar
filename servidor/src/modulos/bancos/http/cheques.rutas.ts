import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ChequesControlador } from './cheques.controlador.js';
import {
  esquemaAnulacionDeCheque,
  esquemaEmisionDeCheque,
  esquemaParamsCheque,
  esquemaParamsCuentaBancariaDeCheques,
} from './cheques.esquemas-http.js';

const etiquetas = ['Bancos'];

/** Emitir y anular cheques: desde Movimientos (operación); sin Excel. */
export function rutasCheques(controlador: ChequesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/bancos/cuentas-bancarias/:cuentaBancariaId/siguiente-cheque', {
      schema: { tags: etiquetas, params: esquemaParamsCuentaBancariaDeCheques },
      preHandler: proteger({ permiso: 'bancos.cheques.emitir' }),
      handler: controlador.siguienteDisponible,
    });
    app.post('/bancos/cheques/:chequeId/emitir', {
      schema: { tags: etiquetas, params: esquemaParamsCheque, body: esquemaEmisionDeCheque },
      preHandler: proteger({ permiso: 'bancos.cheques.emitir' }),
      handler: controlador.emitir,
    });
    app.post('/bancos/cheques/:chequeId/anular', {
      schema: { tags: etiquetas, params: esquemaParamsCheque, body: esquemaAnulacionDeCheque },
      preHandler: proteger({ permiso: 'bancos.cheques.anular' }),
      handler: controlador.anular,
    });
  };
}
