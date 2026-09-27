import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { SesionControlador } from './sesion.controlador.js';
import { esquemaCambioEmpresa, esquemaInicioSesion } from './sesion.esquemas-http.js';

const tags = ['Autenticación'];

/** Diez intentos por minuto: frena a quien prueba contraseñas. */
const LIMITE_DE_INTENTOS = { rateLimit: { max: 10, timeWindow: '1 minute' } };

export function rutasSesion(sesion: SesionControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const conSesion = proteger({ requiereEmpresa: false });
    app.post('/autenticacion/iniciar-sesion', {
      schema: { tags, body: esquemaInicioSesion },
      config: LIMITE_DE_INTENTOS,
      handler: sesion.iniciar,
    });
    app.post('/autenticacion/cerrar-sesion', { schema: { tags }, handler: sesion.cerrar });
    app.get('/sesion', { schema: { tags }, preHandler: conSesion, handler: sesion.obtenerResumen });
    app.put('/sesion/empresa-activa', {
      schema: { tags, body: esquemaCambioEmpresa },
      preHandler: conSesion,
      handler: sesion.cambiarEmpresa,
    });
  };
}
