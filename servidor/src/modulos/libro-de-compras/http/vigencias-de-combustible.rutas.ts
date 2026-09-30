import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { VigenciasDeCombustibleControlador } from './vigencias-de-combustible.controlador.js';
import {
  esquemaVigenciaDeCombustible,
  esquemaParamsVigenciaDeCombustible,
} from './vigencias-de-combustible.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Libro de compras'];
const RUTA = '/libro-de-compras/vigencias-de-combustible';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'vigencias-de-combustible',
  permisos: {
    importar: 'libro-de-compras.vigencias-de-combustible.importar',
    exportar: 'libro-de-compras.vigencias-de-combustible.exportar',
  },
};

const conId = { tags: etiquetas, params: esquemaParamsVigenciaDeCombustible };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: VigenciasDeCombustibleControlador) {
  const crear = proteger({ permiso: 'libro-de-compras.vigencias-de-combustible.crear' });
  const editar = proteger({ permiso: 'libro-de-compras.vigencias-de-combustible.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaVigenciaDeCombustible },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:vigenciaDeCombustibleId`, {
    schema: { ...conId, body: esquemaVigenciaDeCombustible },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:vigenciaDeCombustibleId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'libro-de-compras.vigencias-de-combustible.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasVigenciasDeCombustible(
  controlador: VigenciasDeCombustibleControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'libro-de-compras.vigencias-de-combustible.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:vigenciaDeCombustibleId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
