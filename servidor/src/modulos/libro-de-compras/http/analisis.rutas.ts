import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { AnalisisControlador, type AnalisisPublicado } from './analisis.controlador.js';
import { esquemaConsultaDeAnalisis } from './analisis.esquemas-http.js';

const tags = ['Libro de compras'];
const RAIZ = '/libro-de-compras/analisis';

/**
 * Las rutas de los análisis de compras: cada uno tiene `GET <ruta>` con `analisis-de-compras.ver` y
 * `GET <ruta>/exportar` con `analisis-de-compras.exportar`.
 */
export const rutasDeAnalisis =
  (analisis: AnalisisPublicado[]): FastifyPluginAsyncZod =>
  async (app) => {
    const ver = proteger({ permiso: 'libro-de-compras.analisis-de-compras.ver' });
    const exportar = proteger({ permiso: 'libro-de-compras.analisis-de-compras.exportar' });
    const schema = { tags, querystring: esquemaConsultaDeAnalisis };
    for (const publicado of analisis) {
      const controlador = new AnalisisControlador(publicado);
      app.get(`${RAIZ}/${publicado.ruta}`, { schema, preHandler: ver, handler: controlador.consultar });
      app.get(`${RAIZ}/${publicado.ruta}/exportar`, { schema, preHandler: exportar, handler: controlador.exportar });
    }
  };
