import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaAnulacion, esquemaEliminacion, esquemaParamsMovimiento } from './movimientos.esquemas-http.js';
import type { NotasControlador } from './notas.controlador.js';
import {
  esquemaFiltroDeNotas,
  esquemaNota,
  esquemaReclasificacion,
  esquemaReclasificacionVarios,
} from './notas.esquemas-http.js';
import { esquemaFiltroDeSugerencias, esquemaSugerenciaDeNota } from './sugerencias.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Bancos'];
const RUTA = '/bancos/notas';
const conId = { tags: etiquetas, params: esquemaParamsMovimiento };

function rutasDeLectura(app: Aplicacion, controlador: NotasControlador) {
  const ver = proteger({ permiso: 'bancos.notas.ver' });
  app.get(RUTA, {
    schema: { tags: etiquetas, querystring: esquemaFiltroDeNotas },
    preHandler: ver,
    handler: controlador.listar,
  });
  app.get(`${RUTA}/:movimientoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
}

/** Sugerencias de concepto (P7): la bandeja con los filtros de la bandeja y la captura de una nota. */
function rutasDeSugerencias(app: Aplicacion, controlador: NotasControlador) {
  app.get(`${RUTA}/sugerencias-de-concepto`, {
    schema: { tags: etiquetas, querystring: esquemaFiltroDeSugerencias },
    preHandler: proteger({ permiso: 'bancos.notas.editar' }),
    handler: controlador.sugerenciasDeSinClasificar,
  });
  app.post(`${RUTA}/sugerir-concepto`, {
    schema: { tags: etiquetas, body: esquemaSugerenciaDeNota },
    preHandler: proteger({ permiso: 'bancos.notas.crear' }),
    handler: controlador.sugerirConcepto,
  });
}

/** Reclasificar (solo el concepto): de uno o varios a un concepto, o cada uno al suyo (sugerencias aceptadas). */
function rutasDeReclasificacion(app: Aplicacion, controlador: NotasControlador) {
  const editar = proteger({ permiso: 'bancos.notas.editar' });
  app.post(`${RUTA}/reclasificar`, {
    schema: { tags: etiquetas, body: esquemaReclasificacion },
    preHandler: editar,
    handler: controlador.reclasificar,
  });
  app.post(`${RUTA}/reclasificar-varios`, {
    schema: { tags: etiquetas, body: esquemaReclasificacionVarios },
    preHandler: editar,
    handler: controlador.reclasificarVarios,
  });
}

/** Registrar y corregir con `crear` y `editar`; anular y eliminar tienen su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: NotasControlador) {
  const crear = proteger({ permiso: 'bancos.notas.crear' });
  const editar = proteger({ permiso: 'bancos.notas.editar' });
  app.post(RUTA, { schema: { tags: etiquetas, body: esquemaNota }, preHandler: crear, handler: controlador.crear });
  app.put(`${RUTA}/:movimientoId`, {
    schema: { ...conId, body: esquemaNota },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.post(`${RUTA}/:movimientoId/anular`, {
    schema: { ...conId, body: esquemaAnulacion },
    preHandler: proteger({ permiso: 'bancos.notas.anular' }),
    handler: controlador.anular,
  });
  app.delete(`${RUTA}/:movimientoId`, {
    schema: { ...conId, body: esquemaEliminacion },
    preHandler: proteger({ permiso: 'bancos.notas.eliminar' }),
    handler: controlador.eliminar,
  });
}

/** Notas de crédito y de débito: sin saldo inicial (se registra en la ficha de la cuenta) y sin Excel (es operación). */
export function rutasNotas(controlador: NotasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLectura(app, controlador);
    rutasDeSugerencias(app, controlador);
    rutasDeReclasificacion(app, controlador);
    rutasDeEscritura(app, controlador);
  };
}
