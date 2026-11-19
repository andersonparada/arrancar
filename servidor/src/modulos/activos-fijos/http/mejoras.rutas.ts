import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaParamsActivo } from './activos.esquemas-http.js';
import type { MejorasControlador } from './mejoras.controlador.js';
import {
  esquemaAnulacionDeMejora,
  esquemaMejora,
  esquemaParamsMejora,
  esquemaRevisionDeEstimacion,
  esquemaValorFiscalDelInmueble,
} from './mejoras.esquemas-http.js';

const etiquetas = ['Activos fijos'];
const RUTA_DE_ACTIVOS = '/activos-fijos/activos/:activoId';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

/** Las mejoras y costos posteriores: verlas con `activos.ver`, registrarlas con `mejoras.crear` y anularlas con `mejoras.anular`. */
function rutasDeLasMejoras(app: Aplicacion, controlador: MejorasControlador) {
  app.get(`${RUTA_DE_ACTIVOS}/mejoras`, {
    schema: { tags: etiquetas, params: esquemaParamsActivo },
    preHandler: proteger({ permiso: 'activos-fijos.activos.ver' }),
    handler: controlador.listar,
  });
  app.post('/activos-fijos/mejoras', {
    schema: { tags: etiquetas, body: esquemaMejora },
    preHandler: proteger({ permiso: 'activos-fijos.mejoras.crear' }),
    handler: controlador.registrar,
  });
  app.post('/activos-fijos/mejoras/:mejoraId/anular', {
    schema: { tags: etiquetas, params: esquemaParamsMejora, body: esquemaAnulacionDeMejora },
    preHandler: proteger({ permiso: 'activos-fijos.mejoras.anular' }),
    handler: controlador.anular,
  });
}

/** Los cambios de la depreciación hacia adelante de un activo en uso: la estimación contable y la matrícula o el catastro. */
function rutasDeRevisiones(app: Aplicacion, controlador: MejorasControlador) {
  const preHandler = proteger({ permiso: 'activos-fijos.activos.revisar-estimacion' });
  app.post(`${RUTA_DE_ACTIVOS}/revisar-estimacion`, {
    schema: { tags: etiquetas, params: esquemaParamsActivo, body: esquemaRevisionDeEstimacion },
    preHandler,
    handler: controlador.revisarEstimacion,
  });
  app.post(`${RUTA_DE_ACTIVOS}/valor-fiscal-del-inmueble`, {
    schema: { tags: etiquetas, params: esquemaParamsActivo, body: esquemaValorFiscalDelInmueble },
    preHandler,
    handler: controlador.cambiarValorFiscal,
  });
}

export function rutasMejoras(controlador: MejorasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLasMejoras(app, controlador);
    rutasDeRevisiones(app, controlador);
  };
}
