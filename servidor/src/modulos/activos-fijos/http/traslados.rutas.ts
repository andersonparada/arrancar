import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { limitarSubidas } from '../../core/archivos/http/limite-de-subidas.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { TrasladosControlador } from './traslados.controlador.js';
import { esquemaAnulacionDeTraslado, esquemaParamsBoleta, esquemaTraslado } from './traslados.esquemas-http.js';

const etiquetas = ['Activos fijos'];
type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

/** El escaneo firmado de la boleta (PDF o foto): se sube con `traslados.crear` y se abre con `activos.ver`. */
function rutasDeLaFirmada(app: Aplicacion, controlador: TrasladosControlador) {
  app.post('/activos-fijos/traslados/:grupoId/firmada', {
    schema: { tags: etiquetas, params: esquemaParamsBoleta, consumes: ['multipart/form-data'] },
    preHandler: [proteger({ permiso: 'activos-fijos.traslados.crear' }), limitarSubidas(app)],
    handler: controlador.subirFirmada,
  });
  app.get('/activos-fijos/traslados/:grupoId/firmada', {
    schema: { tags: etiquetas, params: esquemaParamsBoleta },
    preHandler: proteger({ permiso: 'activos-fijos.activos.ver' }),
    handler: controlador.abrirFirmada,
  });
}

/** Trasladar con `traslados.crear`, anular la boleta con `traslados.anular` y verla (imprimirla) con `activos.ver`. */
export function rutasTraslados(controlador: TrasladosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post('/activos-fijos/traslados', {
      schema: { tags: etiquetas, body: esquemaTraslado },
      preHandler: proteger({ permiso: 'activos-fijos.traslados.crear' }),
      handler: controlador.trasladar,
    });
    app.post('/activos-fijos/traslados/:grupoId/anular', {
      schema: { tags: etiquetas, params: esquemaParamsBoleta, body: esquemaAnulacionDeTraslado },
      preHandler: proteger({ permiso: 'activos-fijos.traslados.anular' }),
      handler: controlador.anular,
    });
    app.get('/activos-fijos/traslados/:grupoId/boleta', {
      schema: { tags: etiquetas, params: esquemaParamsBoleta },
      preHandler: proteger({ permiso: 'activos-fijos.activos.ver' }),
      handler: controlador.obtenerBoleta,
    });
    rutasDeLaFirmada(app, controlador);
  };
}
