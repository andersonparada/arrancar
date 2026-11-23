import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { EnlacesControlador } from './enlaces.controlador.js';
import { esquemaEnlace, esquemaParamsEnlace, esquemaParamsRol } from './enlaces.esquemas-http.js';

const etiquetas = ['Contabilidad'];
const RUTA = '/contabilidad/enlaces';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'enlaces-contables',
  permisos: { importar: 'contabilidad.enlaces.importar', exportar: 'contabilidad.enlaces.exportar' },
};

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

/** Enlazar, cambiar y quitar exigen el mismo permiso: `contabilidad.enlaces.editar`. */
function rutasDeEscritura(app: Aplicacion, controlador: EnlacesControlador) {
  const editar = proteger({ permiso: 'contabilidad.enlaces.editar' });

  app.put(`${RUTA}/:rol`, {
    schema: { tags: etiquetas, params: esquemaParamsRol, body: esquemaEnlace },
    preHandler: editar,
    handler: controlador.guardar,
  });
  app.delete(`${RUTA}/:enlaceId`, {
    schema: { tags: etiquetas, params: esquemaParamsEnlace },
    preHandler: editar,
    handler: controlador.quitar,
  });
}

export function rutasEnlaces(
  controlador: EnlacesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'contabilidad.enlaces.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/llaves/:rol`, {
      schema: { tags: etiquetas, params: esquemaParamsRol },
      preHandler: ver,
      handler: controlador.llaves,
    });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
