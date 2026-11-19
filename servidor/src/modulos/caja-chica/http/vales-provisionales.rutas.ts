import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaParamsDeFondo } from './fondos.esquemas-http.js';
import type { ValesProvisionalesControlador } from './vales-provisionales.controlador.js';
import {
  esquemaAnularVale,
  esquemaEntregarVale,
  esquemaLiquidarVale,
  esquemaParamsDeVale,
} from './vales-provisionales.esquemas-http.js';

const tags = ['Caja chica'];
const RUTA = '/caja-chica';

/**
 * Los vales provisionales: la lista de un fondo y la ficha de uno (`fondos.ver`, solo los fondos asignados al usuario),
 * entregar (`vales.crear`), liquidar (`vales.liquidar`) y anular (`vales.anular`).
 */
export function rutasDeValesProvisionales(controlador: ValesProvisionalesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    consultas(app, controlador);
    cambios(app, controlador);
  };
}

function consultas(app: FastifyInstance, controlador: ValesProvisionalesControlador): void {
  app.get(`${RUTA}/fondos/:id/vales-provisionales`, {
    schema: { tags, params: esquemaParamsDeFondo },
    preHandler: proteger({ permiso: 'caja-chica.fondos.ver' }),
    handler: controlador.listar,
  });
  app.get(`${RUTA}/vales-provisionales/:id`, {
    schema: { tags, params: esquemaParamsDeVale },
    preHandler: proteger({ permiso: 'caja-chica.fondos.ver' }),
    handler: controlador.obtener,
  });
}

function cambios(app: FastifyInstance, controlador: ValesProvisionalesControlador): void {
  app.post(`${RUTA}/fondos/:id/vales-provisionales`, {
    schema: { tags, params: esquemaParamsDeFondo, body: esquemaEntregarVale },
    preHandler: proteger({ permiso: 'caja-chica.vales.crear' }),
    handler: controlador.entregar,
  });
  app.post(`${RUTA}/vales-provisionales/:id/liquidar`, {
    schema: { tags, params: esquemaParamsDeVale, body: esquemaLiquidarVale },
    preHandler: proteger({ permiso: 'caja-chica.vales.liquidar' }),
    handler: controlador.liquidar,
  });
  app.post(`${RUTA}/vales-provisionales/:id/anular`, {
    schema: { tags, params: esquemaParamsDeVale, body: esquemaAnularVale },
    preHandler: proteger({ permiso: 'caja-chica.vales.anular' }),
    handler: controlador.anular,
  });
}
