import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { DteRecibidosControlador } from './dte-recibidos.controlador.js';
import {
  esquemaCompletarDteRecibidos,
  esquemaConfirmarDteRecibidos,
  esquemaDescartarDteRecibidos,
  esquemaFiltroDeDteRecibidos,
  esquemaParamsDeDte,
} from './dte-recibidos.esquemas-http.js';
import { limitarConfirmaciones } from './limite-de-confirmaciones.js';

const tags = ['Libro de compras'];
const RUTA = '/libro-de-compras/dte-recibidos';

type App = Parameters<FastifyPluginAsyncZod>[0];

/** Ver y completar la bandeja: `documentos.importar`. */
function rutasDeLaBandeja(app: App, controlador: DteRecibidosControlador): void {
  const importar = proteger({ permiso: 'libro-de-compras.documentos.importar' });
  app.get(RUTA, {
    schema: { tags, querystring: esquemaFiltroDeDteRecibidos },
    preHandler: importar,
    handler: controlador.listar,
  });
  app.patch(RUTA, {
    schema: { tags, body: esquemaCompletarDteRecibidos },
    preHandler: importar,
    handler: controlador.completar,
  });
}

/** Vista previa, confirmar y solicitud para el formulario son parte de registrar: `documentos.crear`. */
function rutasDeRegistro(app: App, controlador: DteRecibidosControlador): void {
  const crear = proteger({ permiso: 'libro-de-compras.documentos.crear' });
  const limite = limitarConfirmaciones(app);
  app.post(`${RUTA}/vista-previa`, {
    schema: { tags, body: esquemaConfirmarDteRecibidos },
    preHandler: [crear, limite],
    handler: controlador.vistaPrevia,
  });
  app.post(`${RUTA}/confirmar`, {
    schema: { tags, body: esquemaConfirmarDteRecibidos },
    preHandler: [crear, limite],
    handler: controlador.confirmar,
  });
  app.get(`${RUTA}/:dteId/solicitud`, {
    schema: { tags, params: esquemaParamsDeDte },
    preHandler: crear,
    handler: controlador.solicitud,
  });
}

/** Descartar y restaurar tienen su propio permiso: `dte-recibidos.descartar`. */
function rutasDeDescarte(app: App, controlador: DteRecibidosControlador): void {
  const descartar = proteger({ permiso: 'libro-de-compras.dte-recibidos.descartar' });
  app.post(`${RUTA}/descartar`, {
    schema: { tags, body: esquemaDescartarDteRecibidos },
    preHandler: descartar,
    handler: controlador.descartar,
  });
  app.post(`${RUTA}/:dteId/restaurar`, {
    schema: { tags, params: esquemaParamsDeDte },
    preHandler: descartar,
    handler: controlador.restaurar,
  });
}

/** La bandeja de DTE recibidos de la SAT; cada grupo de rutas exige su permiso (el servidor valida siempre). */
export function rutasDeDteRecibidos(controlador: DteRecibidosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLaBandeja(app, controlador);
    rutasDeRegistro(app, controlador);
    rutasDeDescarte(app, controlador);
  };
}
