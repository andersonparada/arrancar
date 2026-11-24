import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ValoresDeInmuebleControlador } from './valores-de-inmueble.controlador.js';
import {
  esquemaParamsDeValoresDeInmueble,
  esquemaParamsValorDeInmueble,
  esquemaValorDeInmueble,
} from './valores-de-inmueble.esquemas-http.js';

const etiquetas = ['Empresas'];
const RUTA = '/empresas/inmuebles/:inmuebleId/valores';

/** Ver el histórico exige `ver`; registrar y eliminar valores, `editar` (PA-0b). */
export function rutasValoresDeInmueble(controlador: ValoresDeInmuebleControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const editar = proteger({ permiso: 'empresas.inmuebles.editar' });
    app.get(RUTA, {
      schema: { tags: etiquetas, params: esquemaParamsDeValoresDeInmueble },
      preHandler: proteger({ permiso: 'empresas.inmuebles.ver' }),
      handler: controlador.listar,
    });
    app.post(RUTA, {
      schema: { tags: etiquetas, params: esquemaParamsDeValoresDeInmueble, body: esquemaValorDeInmueble },
      preHandler: editar,
      handler: controlador.registrar,
    });
    app.delete(`${RUTA}/:valorId`, {
      schema: { tags: etiquetas, params: esquemaParamsValorDeInmueble },
      preHandler: editar,
      handler: controlador.eliminar,
    });
  };
}
