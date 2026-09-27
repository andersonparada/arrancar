import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { BitacoraControlador } from './bitacora.controlador.js';

/** Solo soporte ve la bitácora, desde su panel de plataforma. */
export function rutasBitacora(bitacora: BitacoraControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/plataforma/bitacora', {
      schema: { tags: ['Plataforma'] },
      preHandler: proteger({ soloSuperacceso: true }),
      handler: bitacora.listarReciente,
    });
  };
}
