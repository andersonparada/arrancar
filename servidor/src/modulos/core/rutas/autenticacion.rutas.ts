import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { autenticacionControlador } from '../controladores/autenticacion.controlador.js';
import { proteger } from '../http/guardias.js';
import { esquemaCambioEmpresa, esquemaInicioSesion } from '../validaciones/autenticacion.validaciones.js';

export const rutasAutenticacion: FastifyPluginAsyncZod = async (app) => {
  app.post('/autenticacion/iniciar-sesion', {
    schema: { tags: ['Autenticación'], body: esquemaInicioSesion },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: autenticacionControlador.iniciarSesion,
  });

  app.post('/autenticacion/cerrar-sesion', {
    schema: { tags: ['Autenticación'] },
    handler: autenticacionControlador.cerrarSesion,
  });

  app.get('/sesion', {
    schema: { tags: ['Autenticación'] },
    preHandler: proteger({ requiereEmpresa: false }),
    handler: autenticacionControlador.obtenerSesion,
  });

  app.put('/sesion/empresa-activa', {
    schema: { tags: ['Autenticación'], body: esquemaCambioEmpresa },
    preHandler: proteger({ requiereEmpresa: false }),
    handler: autenticacionControlador.cambiarEmpresaActiva,
  });
};
