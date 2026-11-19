import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { FondosControlador } from './fondos.controlador.js';
import {
  esquemaAnularApertura,
  esquemaApertura,
  esquemaAumento,
  esquemaCierre,
  esquemaCustodio,
  esquemaDisminucion,
  esquemaEdicion,
  esquemaListaDeFondos,
  esquemaParamsDeFondo,
} from './fondos.esquemas-http.js';

const tags = ['Caja chica'];
const RUTA = '/caja-chica/fondos';

/**
 * Los fondos: lista y ficha (`fondos.ver`, solo los asignados al usuario), abrir (`fondos.crear`), editar y cambiar el
 * custodio (`fondos.editar`), aumentar y disminuir (`fondos.cambiar-monto`) y anular la apertura y cerrar (`fondos.cerrar`).
 */
export function rutasDeFondos(controlador: FondosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    consultas(app, controlador);
    altas(app, controlador);
    cambios(app, controlador);
    cambiosDeMonto(app, controlador);
  };
}

function consultas(app: FastifyInstance, controlador: FondosControlador): void {
  const ver = proteger({ permiso: 'caja-chica.fondos.ver' });
  app.get(RUTA, { schema: { tags, querystring: esquemaListaDeFondos }, preHandler: ver, handler: controlador.listar });
  app.get(`${RUTA}/:id`, {
    schema: { tags, params: esquemaParamsDeFondo },
    preHandler: ver,
    handler: controlador.obtener,
  });
}

function altas(app: FastifyInstance, controlador: FondosControlador): void {
  app.post(RUTA, {
    schema: { tags, body: esquemaApertura },
    preHandler: proteger({ permiso: 'caja-chica.fondos.crear' }),
    handler: controlador.abrir,
  });
}

function cambios(app: FastifyInstance, controlador: FondosControlador): void {
  const params = esquemaParamsDeFondo;
  const editar = proteger({ permiso: 'caja-chica.fondos.editar' });
  app.patch(`${RUTA}/:id`, {
    schema: { tags, params, body: esquemaEdicion },
    preHandler: editar,
    handler: controlador.editar,
  });
  app.post(`${RUTA}/:id/custodio`, {
    schema: { tags, params, body: esquemaCustodio },
    preHandler: editar,
    handler: controlador.cambiarCustodio,
  });
  app.post(`${RUTA}/:id/anular-apertura`, {
    schema: { tags, params, body: esquemaAnularApertura },
    preHandler: proteger({ permiso: 'caja-chica.fondos.cerrar' }),
    handler: controlador.anularApertura,
  });
  app.post(`${RUTA}/:id/cerrar`, {
    schema: { tags, params, body: esquemaCierre },
    preHandler: proteger({ permiso: 'caja-chica.fondos.cerrar' }),
    handler: controlador.cerrar,
  });
}

function cambiosDeMonto(app: FastifyInstance, controlador: FondosControlador): void {
  const params = esquemaParamsDeFondo;
  const cambiarMonto = proteger({ permiso: 'caja-chica.fondos.cambiar-monto' });
  app.post(`${RUTA}/:id/aumentar`, {
    schema: { tags, params, body: esquemaAumento },
    preHandler: cambiarMonto,
    handler: controlador.aumentar,
  });
  app.post(`${RUTA}/:id/disminuir`, {
    schema: { tags, params, body: esquemaDisminucion },
    preHandler: cambiarMonto,
    handler: controlador.disminuir,
  });
}
