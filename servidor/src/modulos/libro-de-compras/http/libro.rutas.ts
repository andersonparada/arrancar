import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { LibroControlador } from './libro.controlador.js';
import { esquemaConsultaDelLibro } from './libro.esquemas-http.js';

const tags = ['Libro de compras'];
const RUTA = '/libro-de-compras/libro';

/** El libro del período y su anexo de anulados exigen `libro.ver`. */
export function rutasDelLibro(controlador: LibroControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'libro-de-compras.libro.ver' });
    const schema = { tags, querystring: esquemaConsultaDelLibro };
    app.get(RUTA, { schema, preHandler: ver, handler: controlador.consultar });
    app.get(`${RUTA}/anulados`, { schema, preHandler: ver, handler: controlador.anulados });
  };
}
