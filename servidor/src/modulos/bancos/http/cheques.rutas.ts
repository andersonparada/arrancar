import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ChequesControlador } from './cheques.controlador.js';
import { esquemaReclasificacion } from './notas.esquemas-http.js';
import { esquemaSugerenciaDeCheque } from './sugerencias.esquemas-http.js';
import {
  esquemaAnulacionDeCheque,
  esquemaBlanqueoDeCheque,
  esquemaEmisionDeCheque,
  esquemaFiltroDeChequesDeLaEmpresa,
  esquemaParamsCheque,
  esquemaParamsCuentaBancariaDeCheques,
} from './cheques.esquemas-http.js';

const etiquetas = ['Bancos'];

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

function rutasDeLectura(app: Aplicacion, controlador: ChequesControlador) {
  app.get('/bancos/cheques', {
    schema: { tags: etiquetas, querystring: esquemaFiltroDeChequesDeLaEmpresa },
    preHandler: proteger({ permiso: 'bancos.cheques.ver' }),
    handler: controlador.listar,
  });
  app.get('/bancos/cuentas-bancarias/:cuentaBancariaId/siguiente-cheque', {
    schema: { tags: etiquetas, params: esquemaParamsCuentaBancariaDeCheques },
    preHandler: proteger({ permiso: 'bancos.cheques.emitir' }),
    handler: controlador.siguienteDisponible,
  });
}

/** Sugerir el concepto al capturar un cheque (con el permiso de emitir) y reclasificarlo (con el suyo). */
function rutasDeConcepto(app: Aplicacion, controlador: ChequesControlador) {
  app.post('/bancos/cheques/sugerir-concepto', {
    schema: { tags: etiquetas, body: esquemaSugerenciaDeCheque },
    preHandler: proteger({ permiso: 'bancos.cheques.emitir' }),
    handler: controlador.sugerirConcepto,
  });
  app.post('/bancos/cheques/reclasificar', {
    schema: { tags: etiquetas, body: esquemaReclasificacion },
    preHandler: proteger({ permiso: 'bancos.cheques.reclasificar' }),
    handler: controlador.reclasificar,
  });
}

/** Emitir, anular y blanquear: cada uno con su permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: ChequesControlador) {
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
  app.post('/bancos/cheques/:chequeId/blanquear', {
    schema: { tags: etiquetas, params: esquemaParamsCheque, body: esquemaBlanqueoDeCheque },
    preHandler: proteger({ permiso: 'bancos.cheques.blanquear' }),
    handler: controlador.blanquear,
  });
}

/** Ver, emitir, anular, blanquear y reclasificar cheques: la lista es operación (los emitidos y anulados); sin Excel. */
export function rutasCheques(controlador: ChequesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLectura(app, controlador);
    rutasDeConcepto(app, controlador);
    rutasDeEscritura(app, controlador);
  };
}
