import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ArticulosControlador } from './articulos.controlador.js';
import { esquemaArticulo, esquemaConversiones, esquemaLote, esquemaParamsArticulo } from './articulos.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Inventarios'];
const RUTA = '/inventarios/articulos';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'articulos',
  permisos: { importar: 'inventarios.articulos.importar', exportar: 'inventarios.articulos.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsArticulo };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: ArticulosControlador) {
  const crear = proteger({ permiso: 'inventarios.articulos.crear' });
  const editar = proteger({ permiso: 'inventarios.articulos.editar' });
  const eliminar = proteger({ permiso: 'inventarios.articulos.eliminar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaArticulo },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:articuloId`, {
    schema: { ...conId, body: esquemaArticulo },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:articuloId`, { schema: conId, preHandler: eliminar, handler: controlador.eliminar });
}

/** Las conversiones y los lotes cuelgan del artículo: se editan con el permiso de editarlo. */
function rutasDeConversionesYLotes(app: Aplicacion, controlador: ArticulosControlador) {
  const ver = proteger({ permiso: 'inventarios.articulos.ver' });
  const editar = proteger({ permiso: 'inventarios.articulos.editar' });

  app.get(`${RUTA}/:articuloId/conversiones`, {
    schema: conId,
    preHandler: ver,
    handler: controlador.listarConversiones,
  });
  app.put(`${RUTA}/:articuloId/conversiones`, {
    schema: { ...conId, body: esquemaConversiones },
    preHandler: editar,
    handler: controlador.reemplazarConversiones,
  });
  app.get(`${RUTA}/:articuloId/lotes`, { schema: conId, preHandler: ver, handler: controlador.listarLotes });
  app.post(`${RUTA}/:articuloId/lotes`, {
    schema: { ...conId, body: esquemaLote },
    preHandler: editar,
    handler: controlador.crearLote,
  });
}

export function rutasArticulos(
  controlador: ArticulosControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'inventarios.articulos.ver' });
    const crear = proteger({ permiso: 'inventarios.articulos.crear' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/codigo-propuesto`, {
      schema: { tags: etiquetas },
      preHandler: crear,
      handler: controlador.proponerCodigo,
    });
    app.get(`${RUTA}/conceptos-de-gasto`, {
      schema: { tags: etiquetas },
      preHandler: ver,
      handler: controlador.listarConceptos,
    });
    app.get(`${RUTA}/:articuloId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeConversionesYLotes(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
