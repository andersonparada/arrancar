import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { CierresDeCargaControlador } from './cierres-de-carga.controlador.js';
import { esquemaParamsCierre } from './cierres-de-carga.esquemas-http.js';
import { esquemaParamsEmpresa } from './empresas.esquemas-http.js';

const tags = ['Empresas'];
const RUTA = '/empresas/:empresaId/carga-inicial';

/** Lo que quedó guardado de los cierres de la carga inicial: historial, revisión de cada cierre y su Excel. */
export function rutasDeCierresDeCarga(controlador: CierresDeCargaControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const verCierres = proteger({ permiso: 'empresas.carga-inicial.ver-cierres' });
    app.get(`${RUTA}/historial`, {
      schema: { tags, params: esquemaParamsEmpresa },
      preHandler: verCierres,
      handler: controlador.listarHistorial,
    });
    app.get(`${RUTA}/cierres/:cierreId`, {
      schema: { tags, params: esquemaParamsCierre },
      preHandler: verCierres,
      handler: controlador.obtenerCierre,
    });
    app.get(`${RUTA}/cierres/:cierreId/exportar`, {
      schema: { tags, params: esquemaParamsCierre },
      preHandler: proteger({ permiso: 'empresas.carga-inicial.exportar' }),
      handler: controlador.exportarCierre,
    });
  };
}
