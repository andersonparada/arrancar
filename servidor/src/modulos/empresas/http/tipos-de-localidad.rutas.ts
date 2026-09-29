import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { TiposDeLocalidadControlador } from './tipos-de-localidad.controlador.js';
import { esquemaTipoDeLocalidad, esquemaParamsTipoDeLocalidad } from './tipos-de-localidad.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Empresas'];
const RUTA = '/empresas/tipos-de-localidad';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'tipos-de-localidad',
  permisos: { importar: 'empresas.tipos-de-localidad.importar', exportar: 'empresas.tipos-de-localidad.exportar' },
};
const conId = { tags: etiquetas, params: esquemaParamsTipoDeLocalidad };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: TiposDeLocalidadControlador) {
  const crear = proteger({ permiso: 'empresas.tipos-de-localidad.crear' });
  const editar = proteger({ permiso: 'empresas.tipos-de-localidad.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaTipoDeLocalidad },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:tipoDeLocalidadId`, {
    schema: { ...conId, body: esquemaTipoDeLocalidad },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:tipoDeLocalidadId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'empresas.tipos-de-localidad.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasTiposDeLocalidad(
  controlador: TiposDeLocalidadControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'empresas.tipos-de-localidad.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:tipoDeLocalidadId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
