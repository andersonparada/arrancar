import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CombustiblesControlador } from './combustibles.controlador.js';
import { esquemaCombustible, esquemaParamsCombustible } from './combustibles.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Libro de compras'];
const RUTA = '/libro-de-compras/combustibles';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'combustibles',
  permisos: { importar: 'libro-de-compras.combustibles.importar', exportar: 'libro-de-compras.combustibles.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsCombustible };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: CombustiblesControlador) {
  const crear = proteger({ permiso: 'libro-de-compras.combustibles.crear' });
  const editar = proteger({ permiso: 'libro-de-compras.combustibles.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaCombustible },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:combustibleId`, {
    schema: { ...conId, body: esquemaCombustible },
    preHandler: editar,
    handler: controlador.actualizar,
  });
}

export function rutasCombustibles(
  controlador: CombustiblesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'libro-de-compras.combustibles.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:combustibleId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
