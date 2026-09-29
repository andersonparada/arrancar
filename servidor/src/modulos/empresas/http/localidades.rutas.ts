import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { LocalidadesControlador } from './localidades.controlador.js';
import { esquemaLocalidad, esquemaParamsLocalidad } from './localidades.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Empresas'];
const RUTA = '/empresas/localidades';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'localidades',
  permisos: { importar: 'empresas.localidades.importar', exportar: 'empresas.localidades.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsLocalidad };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: LocalidadesControlador) {
  const crear = proteger({ permiso: 'empresas.localidades.crear' });
  const editar = proteger({ permiso: 'empresas.localidades.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaLocalidad },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:localidadId`, {
    schema: { ...conId, body: esquemaLocalidad },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:localidadId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'empresas.localidades.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasLocalidades(
  controlador: LocalidadesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'empresas.localidades.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:localidadId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
