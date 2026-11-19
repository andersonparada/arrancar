import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { InmueblesControlador } from './inmuebles.controlador.js';
import { esquemaInmueble, esquemaParamsInmueble } from './inmuebles.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Empresas'];
const RUTA = '/empresas/inmuebles';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'inmuebles',
  permisos: { importar: 'empresas.inmuebles.importar', exportar: 'empresas.inmuebles.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsInmueble };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: InmueblesControlador) {
  const crear = proteger({ permiso: 'empresas.inmuebles.crear' });
  const editar = proteger({ permiso: 'empresas.inmuebles.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaInmueble },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:inmuebleId`, {
    schema: { ...conId, body: esquemaInmueble },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.post(`${RUTA}/:inmuebleId/inactivar`, { schema: conId, preHandler: editar, handler: controlador.inactivar });
  app.post(`${RUTA}/:inmuebleId/reactivar`, { schema: conId, preHandler: editar, handler: controlador.reactivar });
  app.delete(`${RUTA}/:inmuebleId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'empresas.inmuebles.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasInmuebles(
  controlador: InmueblesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'empresas.inmuebles.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:inmuebleId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
