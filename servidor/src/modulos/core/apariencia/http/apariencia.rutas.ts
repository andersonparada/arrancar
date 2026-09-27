import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../compartido/http/guardias.js';
import type { AparienciaControlador } from './apariencia.controlador.js';
import { esquemaApariencia, esquemaConsultaLogo } from './apariencia.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const tags = ['Apariencia'];

/** Públicas: la pantalla de inicio de sesión ya muestra los colores y el logo. */
function rutasDeLectura(app: Aplicacion, apariencia: AparienciaControlador): void {
  app.get('/apariencia', { schema: { tags }, handler: apariencia.obtener });
  app.get('/apariencia/logo', {
    schema: { tags, querystring: esquemaConsultaLogo },
    handler: apariencia.obtenerLogo,
  });
}

function rutasDeSoporte(app: Aplicacion, apariencia: AparienciaControlador): void {
  const soloSoporte = proteger({ soloSuperacceso: true });
  app.put('/plataforma/apariencia', {
    schema: { tags, body: esquemaApariencia },
    preHandler: soloSoporte,
    handler: apariencia.cambiar,
  });
  app.delete('/plataforma/apariencia', { schema: { tags }, preHandler: soloSoporte, handler: apariencia.restablecer });
  app.put('/plataforma/apariencia/logo', {
    schema: { tags, consumes: ['multipart/form-data'] },
    preHandler: soloSoporte,
    handler: apariencia.cambiarLogo,
  });
  app.delete('/plataforma/apariencia/logo', {
    schema: { tags },
    preHandler: soloSoporte,
    handler: apariencia.quitarLogo,
  });
}

export function rutasApariencia(apariencia: AparienciaControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLectura(app, apariencia);
    rutasDeSoporte(app, apariencia);
  };
}
