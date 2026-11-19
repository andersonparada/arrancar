import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { BodegasControlador } from './bodegas.controlador.js';
import { esquemaBodega, esquemaParamsBodega } from './bodegas.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Inventarios'];
const RUTA = '/inventarios/bodegas';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'bodegas',
  permisos: { importar: 'inventarios.bodegas.importar', exportar: 'inventarios.bodegas.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsBodega };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: BodegasControlador) {
  const crear = proteger({ permiso: 'inventarios.bodegas.crear' });
  const editar = proteger({ permiso: 'inventarios.bodegas.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaBodega },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:bodegaId`, {
    schema: { ...conId, body: esquemaBodega },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:bodegaId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'inventarios.bodegas.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasBodegas(
  controlador: BodegasControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'inventarios.bodegas.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:bodegaId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
