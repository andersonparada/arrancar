import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { LibroControlador } from './libro.controlador.js';
import {
  esquemaConsultaDeEmisiones,
  esquemaConsultaDelLibro,
  esquemaCorreccionDelFolio,
  esquemaEmisionDelLibro,
  esquemaParamsDeEmision,
} from './libro.esquemas-http.js';
import { limitarPdfs } from './limite-de-pdfs.js';

const tags = ['Libro de compras'];
const RUTA = '/libro-de-compras/libro';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const consulta = { tags, querystring: esquemaConsultaDelLibro };

function rutasDeConsulta(app: Aplicacion, controlador: LibroControlador): void {
  const ver = proteger({ permiso: 'libro-de-compras.libro.ver' });
  const exportar = proteger({ permiso: 'libro-de-compras.libro.exportar' });
  app.get(RUTA, { schema: consulta, preHandler: ver, handler: controlador.consultar });
  app.get(`${RUTA}/anulados`, { schema: consulta, preHandler: ver, handler: controlador.anulados });
  app.get(`${RUTA}/exportar`, { schema: consulta, preHandler: exportar, handler: controlador.exportar });
  app.get(`${RUTA}/sat-2237`, { schema: consulta, preHandler: ver, handler: controlador.sat2237 });
  app.get(`${RUTA}/sat-2237/exportar`, {
    schema: consulta,
    preHandler: exportar,
    handler: controlador.exportarSat2237,
  });
  app.get(`${RUTA}/pdf`, {
    schema: consulta,
    preHandler: [ver, limitarPdfs(app, { clave: 'borrador', maximo: 10 })],
    handler: controlador.borrador,
  });
}

function rutasDeEmisiones(app: Aplicacion, controlador: LibroControlador): void {
  const ver = proteger({ permiso: 'libro-de-compras.libro.ver' });
  const emitir = proteger({ permiso: 'libro-de-compras.libro.emitir' });
  app.post(`${RUTA}/emisiones`, {
    schema: { tags, body: esquemaEmisionDelLibro },
    preHandler: [emitir, limitarPdfs(app, { clave: 'emision', maximo: 5 })],
    handler: controlador.emitir,
  });
  app.get(`${RUTA}/emisiones`, {
    schema: { tags, querystring: esquemaConsultaDeEmisiones },
    preHandler: ver,
    handler: controlador.emisiones,
  });
  app.get(`${RUTA}/emisiones/:emisionId/pdf`, {
    schema: { tags, params: esquemaParamsDeEmision },
    preHandler: ver,
    handler: controlador.copia,
  });
  app.put(`${RUTA}/foliacion`, {
    schema: { tags, body: esquemaCorreccionDelFolio },
    preHandler: emitir,
    handler: controlador.corregirFolio,
  });
}

/** El libro y su anexo exigen `libro.ver`; el Excel, `libro.exportar`; emitir con folios y corregirlos, `libro.emitir`. */
export const rutasDelLibro =
  (controlador: LibroControlador): FastifyPluginAsyncZod =>
  async (app) => {
    rutasDeConsulta(app, controlador);
    rutasDeEmisiones(app, controlador);
  };
