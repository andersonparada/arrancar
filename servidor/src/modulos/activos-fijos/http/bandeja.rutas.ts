import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { BandejaControlador } from './bandeja.controlador.js';
import {
  esquemaCapitalizacion,
  esquemaDescarte,
  esquemaFiltrosDeBandeja,
  esquemaParamsLinea,
} from './bandeja.esquemas-http.js';

const etiquetas = ['Activos fijos'];
const RUTA = '/activos-fijos/bandeja';

/** La bandeja «Por capitalizar»: cada acción exige su propio permiso. */
export function rutasBandeja(controlador: BandejaControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const descartar = proteger({ permiso: 'activos-fijos.bandeja.descartar' });
    app.get(RUTA, {
      schema: { tags: etiquetas, querystring: esquemaFiltrosDeBandeja },
      preHandler: proteger({ permiso: 'activos-fijos.bandeja.ver' }),
      handler: controlador.listar,
    });
    app.post(`${RUTA}/capitalizar`, {
      schema: { tags: etiquetas, body: esquemaCapitalizacion },
      preHandler: proteger({ permiso: 'activos-fijos.costos.crear' }),
      handler: controlador.capitalizar,
    });
    app.post(`${RUTA}/:lineaId/descartar`, {
      schema: { tags: etiquetas, params: esquemaParamsLinea, body: esquemaDescarte },
      preHandler: descartar,
      handler: controlador.descartar,
    });
    app.post(`${RUTA}/:lineaId/devolver`, {
      schema: { tags: etiquetas, params: esquemaParamsLinea },
      preHandler: descartar,
      handler: controlador.devolver,
    });
  };
}
