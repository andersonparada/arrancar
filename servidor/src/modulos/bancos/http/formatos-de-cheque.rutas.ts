import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { FormatosDeChequeControlador } from './formatos-de-cheque.controlador.js';
import {
  esquemaEliminacionDeFormatoDeCheque,
  esquemaFormatoDeCheque,
  esquemaParamsFormatoDeCheque,
  esquemaParamsPlantillaDeCheque,
} from './formatos-de-cheque.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Bancos'];
const RUTA = '/bancos/formatos-de-cheque';
const conId = { tags: etiquetas, params: esquemaParamsFormatoDeCheque };

/** Ver los formatos, sus plantillas de fábrica y las hojas de prueba de alineación (que no marcan nada). */
function rutasDeLectura(app: Aplicacion, controlador: FormatosDeChequeControlador) {
  const ver = proteger({ permiso: 'bancos.formatos-de-cheque.ver' });
  app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
  app.get(`${RUTA}/plantillas`, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.plantillas });
  app.get(`${RUTA}/plantillas/:clave/prueba`, {
    schema: { tags: etiquetas, params: esquemaParamsPlantillaDeCheque },
    preHandler: ver,
    handler: controlador.pruebaDePlantilla,
  });
  app.get(`${RUTA}/:formatoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
  app.get(`${RUTA}/:formatoId/prueba`, { schema: conId, preHandler: ver, handler: controlador.prueba });
}

/** Crear, editar (incluye inactivar, reactivar y marcar «probado») y eliminar. */
function rutasDeEscritura(app: Aplicacion, controlador: FormatosDeChequeControlador) {
  const crear = proteger({ permiso: 'bancos.formatos-de-cheque.crear' });
  const editar = proteger({ permiso: 'bancos.formatos-de-cheque.editar' });
  const eliminar = proteger({ permiso: 'bancos.formatos-de-cheque.eliminar' });
  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaFormatoDeCheque },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.patch(`${RUTA}/:formatoId`, {
    schema: { ...conId, body: esquemaFormatoDeCheque },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.post(`${RUTA}/:formatoId/inactivar`, { schema: conId, preHandler: editar, handler: controlador.inactivar });
  app.post(`${RUTA}/:formatoId/reactivar`, { schema: conId, preHandler: editar, handler: controlador.reactivar });
  app.post(`${RUTA}/:formatoId/probado`, { schema: conId, preHandler: editar, handler: controlador.marcarProbado });
  app.delete(`${RUTA}/:formatoId`, {
    schema: { ...conId, body: esquemaEliminacionDeFormatoDeCheque },
    preHandler: eliminar,
    handler: controlador.eliminar,
  });
}

/** Formatos de impresión de cheques de la cuenta: Administración, sin Excel (las posiciones no se capturan en una hoja). */
export function rutasFormatosDeCheque(controlador: FormatosDeChequeControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLectura(app, controlador);
    rutasDeEscritura(app, controlador);
  };
}
