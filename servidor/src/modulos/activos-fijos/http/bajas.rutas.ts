import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { limitarSubidas } from '../../core/archivos/http/limite-de-subidas.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { BajasControlador } from './bajas.controlador.js';
import {
  esquemaAnulacionDeBaja,
  esquemaBaja,
  esquemaConsultaDeActa,
  esquemaParamsBaja,
} from './bajas.esquemas-http.js';

const etiquetas = ['Activos fijos'];
type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

/** El acta y la denuncia (PDF o foto): se suben con `bajas.crear` y se abren con `activos.ver`. */
function rutasDeLosDocumentos(app: Aplicacion, controlador: BajasControlador) {
  const subida = [proteger({ permiso: 'activos-fijos.bajas.crear' }), limitarSubidas(app)];
  app.post('/activos-fijos/bajas/:id/acta', {
    schema: {
      tags: etiquetas,
      params: esquemaParamsBaja,
      querystring: esquemaConsultaDeActa,
      consumes: ['multipart/form-data'],
    },
    preHandler: subida,
    handler: controlador.subirActa,
  });
  app.post('/activos-fijos/bajas/:id/denuncia', {
    schema: { tags: etiquetas, params: esquemaParamsBaja, consumes: ['multipart/form-data'] },
    preHandler: subida,
    handler: controlador.subirDenuncia,
  });
  const ver = {
    schema: { tags: etiquetas, params: esquemaParamsBaja },
    preHandler: proteger({ permiso: 'activos-fijos.activos.ver' }),
  };
  app.get('/activos-fijos/bajas/:id/acta', { ...ver, handler: controlador.abrirActa });
  app.get('/activos-fijos/bajas/:id/denuncia', { ...ver, handler: controlador.abrirDenuncia });
}

/** Dar de baja o vender con `bajas.crear`, anular con `bajas.anular` y ver (imprimir el acta) con `activos.ver`. */
export function rutasBajas(controlador: BajasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post('/activos-fijos/bajas', {
      schema: { tags: etiquetas, body: esquemaBaja },
      preHandler: proteger({ permiso: 'activos-fijos.bajas.crear' }),
      handler: controlador.registrar,
    });
    app.post('/activos-fijos/bajas/:id/anular', {
      schema: { tags: etiquetas, params: esquemaParamsBaja, body: esquemaAnulacionDeBaja },
      preHandler: proteger({ permiso: 'activos-fijos.bajas.anular' }),
      handler: controlador.anular,
    });
    app.get('/activos-fijos/bajas/:id', {
      schema: { tags: etiquetas, params: esquemaParamsBaja },
      preHandler: proteger({ permiso: 'activos-fijos.activos.ver' }),
      handler: controlador.obtener,
    });
    rutasDeLosDocumentos(app, controlador);
  };
}
