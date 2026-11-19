import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ClasesControlador } from './clases.controlador.js';
import { esquemaClase, esquemaConceptosDeClase, esquemaParamsClase } from './clases.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Activos fijos'];
const RUTA = '/activos-fijos/clases';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'clases',
  permisos: { importar: 'activos-fijos.clases.importar', exportar: 'activos-fijos.clases.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsClase };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: ClasesControlador) {
  const crear = proteger({ permiso: 'activos-fijos.clases.crear' });
  const editar = proteger({ permiso: 'activos-fijos.clases.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaClase },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:claseId`, {
    schema: { ...conId, body: esquemaClase },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:claseId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'activos-fijos.clases.eliminar' }),
    handler: controlador.eliminar,
  });
  app.put(`${RUTA}/:claseId/conceptos`, {
    schema: { ...conId, body: esquemaConceptosDeClase },
    preHandler: editar,
    handler: controlador.reemplazarConceptos,
  });
}

export function rutasClases(
  controlador: ClasesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'activos-fijos.clases.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:claseId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    app.get(`${RUTA}/:claseId/conceptos`, { schema: conId, preHandler: ver, handler: controlador.listarConceptos });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
