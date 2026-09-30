import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ConceptosDeGastoControlador } from './conceptos-de-gasto.controlador.js';
import { esquemaConceptoDeGasto, esquemaParamsConceptoDeGasto } from './conceptos-de-gasto.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Libro de compras'];
const RUTA = '/libro-de-compras/conceptos-de-gasto';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'conceptos-de-gasto',
  permisos: {
    importar: 'libro-de-compras.conceptos-de-gasto.importar',
    exportar: 'libro-de-compras.conceptos-de-gasto.exportar',
  },
};

const conId = { tags: etiquetas, params: esquemaParamsConceptoDeGasto };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: ConceptosDeGastoControlador) {
  const crear = proteger({ permiso: 'libro-de-compras.conceptos-de-gasto.crear' });
  const editar = proteger({ permiso: 'libro-de-compras.conceptos-de-gasto.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaConceptoDeGasto },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:conceptoDeGastoId`, {
    schema: { ...conId, body: esquemaConceptoDeGasto },
    preHandler: editar,
    handler: controlador.actualizar,
  });
}

export function rutasConceptosDeGasto(
  controlador: ConceptosDeGastoControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'libro-de-compras.conceptos-de-gasto.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:conceptoDeGastoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
