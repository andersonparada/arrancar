import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { DepartamentosControlador } from './departamentos.controlador.js';
import { esquemaDepartamento, esquemaParamsDepartamento } from './departamentos.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Empresas'];
const RUTA = '/empresas/departamentos';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'departamentos',
  permisos: { importar: 'empresas.departamentos.importar', exportar: 'empresas.departamentos.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsDepartamento };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: DepartamentosControlador) {
  const crear = proteger({ permiso: 'empresas.departamentos.crear' });
  const editar = proteger({ permiso: 'empresas.departamentos.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaDepartamento },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:departamentoId`, {
    schema: { ...conId, body: esquemaDepartamento },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:departamentoId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'empresas.departamentos.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasDepartamentos(
  controlador: DepartamentosControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'empresas.departamentos.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:departamentoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
