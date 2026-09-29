import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { TiposDeLocalidadControlador } from './tipos-de-localidad.controlador.js';
import { esquemaTipoDeLocalidad, esquemaParamsTipoDeLocalidad } from './tipos-de-localidad.esquemas-http.js';

const etiquetas = ['Empresas'];
const RUTA = '/empresas/tipos-de-localidad';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'tipos-de-localidad',
  permisos: { importar: 'empresas.tipos-de-localidad.importar', exportar: 'empresas.tipos-de-localidad.exportar' },
};

export function rutasTiposDeLocalidad(
  controlador: TiposDeLocalidadControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'empresas.tipos-de-localidad.ver' });
    const gestionar = proteger({ permiso: 'empresas.tipos-de-localidad.gestionar' });
    const conId = { tags: etiquetas, params: esquemaParamsTipoDeLocalidad };

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:tipoDeLocalidadId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    app.post(RUTA, {
      schema: { tags: etiquetas, body: esquemaTipoDeLocalidad },
      preHandler: gestionar,
      handler: controlador.crear,
    });
    app.put(`${RUTA}/:tipoDeLocalidadId`, {
      schema: { ...conId, body: esquemaTipoDeLocalidad },
      preHandler: gestionar,
      handler: controlador.actualizar,
    });
    app.delete(`${RUTA}/:tipoDeLocalidadId`, { schema: conId, preHandler: gestionar, handler: controlador.eliminar });
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
