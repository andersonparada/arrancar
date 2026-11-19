import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import { limitarPruebasDeCorreo } from './limite-de-pruebas-de-correo.js';
import type { ServidorDeCorreoControlador } from './servidor-de-correo.controlador.js';
import { esquemaPruebaDeCorreo, esquemaServidorDeCorreo } from './servidor-de-correo.esquemas-http.js';

const tags = ['Soporte: correo'];

/** Solo soporte (superacceso): el servidor de correo es de la instalación, no de una cuenta. */
export function rutasDelServidorDeCorreo(servidor: ServidorDeCorreoControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const soloSoporte = proteger({ soloSuperacceso: true });
    app.get('/soporte/correo/servidor', { schema: { tags }, preHandler: soloSoporte, handler: servidor.obtener });
    app.put('/soporte/correo/servidor', {
      schema: { tags, body: esquemaServidorDeCorreo },
      preHandler: soloSoporte,
      handler: servidor.guardar,
    });
    app.get('/soporte/correo/bandeja', { schema: { tags }, preHandler: soloSoporte, handler: servidor.bandeja });
    app.post('/soporte/correo/prueba', {
      schema: { tags, body: esquemaPruebaDeCorreo },
      preHandler: [soloSoporte, limitarPruebasDeCorreo(app)],
      handler: servidor.probar,
    });
  };
}
