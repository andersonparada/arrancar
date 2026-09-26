import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { aparienciaControlador } from '../controladores/apariencia.controlador.js';
import { proteger } from '../http/guardias.js';
import { esquemaApariencia } from '../validaciones/apariencia.validaciones.js';

/**
 * La lectura es pública porque la pantalla de inicio de sesión ya muestra los
 * colores y el logo; los cambios son solo para soporte.
 */
export const rutasApariencia: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Apariencia'];
  const soloSoporte = proteger({ soloSuperacceso: true });

  app.get('/apariencia', { schema: { tags }, handler: aparienciaControlador.obtener });

  app.get('/apariencia/logo', {
    schema: { tags, querystring: z.object({ v: z.string().max(20).optional() }) },
    handler: aparienciaControlador.obtenerLogo,
  });

  app.put('/plataforma/apariencia', {
    schema: { tags, body: esquemaApariencia },
    preHandler: soloSoporte,
    handler: aparienciaControlador.guardar,
  });

  app.delete('/plataforma/apariencia', {
    schema: { tags },
    preHandler: soloSoporte,
    handler: aparienciaControlador.restablecer,
  });

  app.put('/plataforma/apariencia/logo', {
    schema: { tags, consumes: ['multipart/form-data'] },
    preHandler: soloSoporte,
    handler: aparienciaControlador.cambiarLogo,
  });

  app.delete('/plataforma/apariencia/logo', {
    schema: { tags },
    preHandler: soloSoporte,
    handler: aparienciaControlador.quitarLogo,
  });
};
