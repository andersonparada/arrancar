import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ConceptosControlador } from './conceptos.controlador.js';
import { esquemaConcepto, esquemaEliminacionDeConcepto, esquemaParamsConcepto } from './conceptos.esquemas-http.js';

const etiquetas = ['Bancos'];
const RUTA = '/bancos/conceptos';
const conId = { tags: etiquetas, params: esquemaParamsConcepto };
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'conceptos',
  permisos: { importar: 'bancos.conceptos.importar', exportar: 'bancos.conceptos.exportar' },
};

/** Registrar, cambiar, inactivar (con el cambio) y eliminar: todo con el permiso de gestionar. */
function rutasDeEscritura(app: FastifyInstance, controlador: ConceptosControlador): void {
  const preHandler = proteger({ permiso: 'bancos.conceptos.gestionar' });
  app.post(RUTA, { schema: { tags: etiquetas, body: esquemaConcepto }, preHandler, handler: controlador.crear });
  app.put(`${RUTA}/:conceptoId`, {
    schema: { ...conId, body: esquemaConcepto },
    preHandler,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:conceptoId`, {
    schema: { ...conId, body: esquemaEliminacionDeConcepto },
    preHandler,
    handler: controlador.eliminar,
  });
}

export function rutasConceptos(
  controlador: ConceptosControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'bancos.conceptos.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:conceptoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
