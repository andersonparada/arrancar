import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaParamsActivo } from './activos.esquemas-http.js';
import type { DivisionesControlador } from './divisiones.controlador.js';
import {
  esquemaAnulacionDeDivision,
  esquemaDivision,
  esquemaParamsDivision,
  esquemaSepararEnUnidades,
} from './divisiones.esquemas-http.js';

const etiquetas = ['Activos fijos'];
const RUTA_DE_ACTIVOS = '/activos-fijos/activos/:activoId';

/** Dividir y separar en unidades con `divisiones.crear`; anular una división con `divisiones.anular`. */
export function rutasDivisiones(controlador: DivisionesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(`${RUTA_DE_ACTIVOS}/dividir`, {
      schema: { tags: etiquetas, params: esquemaParamsActivo, body: esquemaDivision },
      preHandler: proteger({ permiso: 'activos-fijos.divisiones.crear' }),
      handler: controlador.dividir,
    });
    app.post(`${RUTA_DE_ACTIVOS}/separar-en-unidades`, {
      schema: { tags: etiquetas, params: esquemaParamsActivo, body: esquemaSepararEnUnidades },
      preHandler: proteger({ permiso: 'activos-fijos.divisiones.crear' }),
      handler: controlador.separar,
    });
    app.post('/activos-fijos/divisiones/:divisionId/anular', {
      schema: { tags: etiquetas, params: esquemaParamsDivision, body: esquemaAnulacionDeDivision },
      preHandler: proteger({ permiso: 'activos-fijos.divisiones.anular' }),
      handler: controlador.anular,
    });
  };
}
