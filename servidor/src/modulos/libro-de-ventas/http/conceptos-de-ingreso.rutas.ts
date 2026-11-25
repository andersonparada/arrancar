import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ConceptosDeIngresoControlador } from './conceptos-de-ingreso.controlador.js';
import { esquemaConceptoDeIngreso, esquemaParamsConceptoDeIngreso } from './conceptos-de-ingreso.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Libro de ventas'];
const RUTA = '/libro-de-ventas/conceptos-de-ingreso';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'conceptos-de-ingreso',
  permisos: {
    importar: 'libro-de-ventas.conceptos-de-ingreso.importar',
    exportar: 'libro-de-ventas.conceptos-de-ingreso.exportar',
  },
};

const conId = { tags: etiquetas, params: esquemaParamsConceptoDeIngreso };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: ConceptosDeIngresoControlador) {
  const crear = proteger({ permiso: 'libro-de-ventas.conceptos-de-ingreso.crear' });
  const editar = proteger({ permiso: 'libro-de-ventas.conceptos-de-ingreso.editar' });
  const eliminar = proteger({ permiso: 'libro-de-ventas.conceptos-de-ingreso.eliminar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaConceptoDeIngreso },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:conceptoDeIngresoId`, {
    schema: { ...conId, body: esquemaConceptoDeIngreso },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:conceptoDeIngresoId`, { schema: conId, preHandler: eliminar, handler: controlador.eliminar });
}

export function rutasConceptosDeIngreso(
  controlador: ConceptosDeIngresoControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'libro-de-ventas.conceptos-de-ingreso.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:conceptoDeIngresoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
