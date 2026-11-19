import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CategoriasControlador } from './categorias.controlador.js';
import { esquemaCategoria, esquemaParamsCategoria } from './categorias.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Inventarios'];
const RUTA = '/inventarios/categorias';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'categorias',
  permisos: { importar: 'inventarios.categorias.importar', exportar: 'inventarios.categorias.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsCategoria };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: CategoriasControlador) {
  const crear = proteger({ permiso: 'inventarios.categorias.crear' });
  const editar = proteger({ permiso: 'inventarios.categorias.editar' });
  const eliminar = proteger({ permiso: 'inventarios.categorias.eliminar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaCategoria },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:categoriaId`, {
    schema: { ...conId, body: esquemaCategoria },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:categoriaId`, { schema: conId, preHandler: eliminar, handler: controlador.eliminar });
}

export function rutasCategorias(
  controlador: CategoriasControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'inventarios.categorias.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:categoriaId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
