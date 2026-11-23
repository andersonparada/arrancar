import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { InicioControlador } from './inicio.controlador.js';
import { esquemaInicio } from './inicio.esquemas-http.js';

const etiquetas = ['Contabilidad'];
const RUTA = '/contabilidad/inicio';

export function rutasInicio(controlador: InicioControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags: etiquetas },
      preHandler: proteger({ permiso: 'contabilidad.inicio.ver' }),
      handler: controlador.obtener,
    });
    app.put(RUTA, {
      schema: { tags: etiquetas, body: esquemaInicio },
      preHandler: proteger({ permiso: 'contabilidad.inicio.editar' }),
      handler: controlador.guardar,
    });
  };
}
