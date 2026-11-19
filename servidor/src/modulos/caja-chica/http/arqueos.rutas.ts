import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ArqueosControlador } from './arqueos.controlador.js';
import { esquemaAnularArqueo, esquemaArqueo, esquemaParamsDeArqueo } from './arqueos.esquemas-http.js';
import { esquemaParamsDeFondo } from './fondos.esquemas-http.js';

const tags = ['Caja chica'];
const RUTA = '/caja-chica';

/**
 * Los arqueos: la lista de un fondo y el acta de uno (`fondos.ver`, solo los fondos asignados al usuario), la propuesta
 * de lo esperado y registrar (`arqueos.crear`) y anular (`arqueos.anular`).
 */
export function rutasDeArqueos(controlador: ArqueosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    consultas(app, controlador);
    cambios(app, controlador);
  };
}

function consultas(app: FastifyInstance, controlador: ArqueosControlador): void {
  const params = esquemaParamsDeFondo;
  app.get(`${RUTA}/fondos/:id/arqueos`, {
    schema: { tags, params },
    preHandler: proteger({ permiso: 'caja-chica.fondos.ver' }),
    handler: controlador.listar,
  });
  app.get(`${RUTA}/fondos/:id/arqueos/propuesta`, {
    schema: { tags, params },
    preHandler: proteger({ permiso: 'caja-chica.arqueos.crear' }),
    handler: controlador.propuesta,
  });
  app.get(`${RUTA}/arqueos/:id`, {
    schema: { tags, params: esquemaParamsDeArqueo },
    preHandler: proteger({ permiso: 'caja-chica.fondos.ver' }),
    handler: controlador.obtener,
  });
}

function cambios(app: FastifyInstance, controlador: ArqueosControlador): void {
  app.post(`${RUTA}/fondos/:id/arqueos`, {
    schema: { tags, params: esquemaParamsDeFondo, body: esquemaArqueo },
    preHandler: proteger({ permiso: 'caja-chica.arqueos.crear' }),
    handler: controlador.registrar,
  });
  app.post(`${RUTA}/arqueos/:id/anular`, {
    schema: { tags, params: esquemaParamsDeArqueo, body: esquemaAnularArqueo },
    preHandler: proteger({ permiso: 'caja-chica.arqueos.anular' }),
    handler: controlador.anular,
  });
}
