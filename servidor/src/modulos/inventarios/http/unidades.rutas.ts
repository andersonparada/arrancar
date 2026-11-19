import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { UnidadesControlador } from './unidades.controlador.js';
import { esquemaUnidad, esquemaParamsUnidad } from './unidades.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Inventarios'];
const RUTA = '/inventarios/unidades';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'unidades',
  permisos: { importar: 'inventarios.unidades.importar', exportar: 'inventarios.unidades.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsUnidad };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: UnidadesControlador) {
  const crear = proteger({ permiso: 'inventarios.unidades.crear' });
  const editar = proteger({ permiso: 'inventarios.unidades.editar' });
  const eliminar = proteger({ permiso: 'inventarios.unidades.eliminar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaUnidad },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:unidadId`, {
    schema: { ...conId, body: esquemaUnidad },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:unidadId`, { schema: conId, preHandler: eliminar, handler: controlador.eliminar });
}

export function rutasUnidades(
  controlador: UnidadesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'inventarios.unidades.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:unidadId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
