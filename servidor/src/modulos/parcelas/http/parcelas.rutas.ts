import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ParcelasControlador } from './parcelas.controlador.js';
import {
  esquemaCambioDeParcela,
  esquemaFiltrosDeParcelas,
  esquemaInactivacionDeParcela,
  esquemaParamsParcela,
  esquemaParcela,
} from './parcelas.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Parcelas'];
const RUTA = '/parcelas/parcelas';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'parcelas',
  permisos: { importar: 'parcelas.parcelas.importar', exportar: 'parcelas.parcelas.exportar' },
};
const conId = { tags: etiquetas, params: esquemaParamsParcela };

/** Cada acción de escritura exige su propio permiso (inactivar y reactivar van con editar). */
function rutasDeEscritura(app: Aplicacion, controlador: ParcelasControlador) {
  const editar = proteger({ permiso: 'parcelas.parcelas.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaParcela },
    preHandler: proteger({ permiso: 'parcelas.parcelas.crear' }),
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:parcelaId`, {
    schema: { ...conId, body: esquemaCambioDeParcela },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.post(`${RUTA}/:parcelaId/inactivar`, {
    schema: { ...conId, body: esquemaInactivacionDeParcela },
    preHandler: editar,
    handler: controlador.inactivar,
  });
  app.post(`${RUTA}/:parcelaId/reactivar`, { schema: conId, preHandler: editar, handler: controlador.reactivar });
  app.delete(`${RUTA}/:parcelaId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'parcelas.parcelas.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasParcelas(
  controlador: ParcelasControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'parcelas.parcelas.ver' });

    // Las rutas fijas del Excel se registran antes que `/:parcelaId` para que no las tome como un id.
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
    app.get(RUTA, {
      schema: { tags: etiquetas, querystring: esquemaFiltrosDeParcelas },
      preHandler: ver,
      handler: controlador.listar,
    });
    app.get(`${RUTA}/:parcelaId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
  };
}
