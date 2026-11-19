import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { AccesosABodegasControlador } from './accesos-a-bodegas.controlador.js';
import { esquemaAccesosDeUsuario, esquemaParamsUsuarioDeAccesos } from './accesos-a-bodegas.esquemas-http.js';
import { esquemaParamsBodega } from './bodegas.esquemas-http.js';

const RUTA = '/inventarios/bodegas';
const etiquetas = ['Inventarios'];
const conUsuario = { tags: etiquetas, params: esquemaParamsUsuarioDeAccesos };

/** La ventana de accesos: todas las rutas exigen `inventarios.bodegas.asignar`. */
export function rutasAccesosABodegas(controlador: AccesosABodegasControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const asignar = proteger({ permiso: 'inventarios.bodegas.asignar' });
    const sinParametros = { schema: { tags: etiquetas }, preHandler: asignar };

    app.get(`${RUTA}/accesos/bodegas`, { ...sinParametros, handler: controlador.listarBodegas });
    app.get(`${RUTA}/accesos/usuarios`, { ...sinParametros, handler: controlador.listarUsuarios });
    app.get(`${RUTA}/accesos/:usuarioId`, {
      schema: conUsuario,
      preHandler: asignar,
      handler: controlador.obtenerAccesos,
    });
    app.put(`${RUTA}/accesos/:usuarioId`, {
      schema: { ...conUsuario, body: esquemaAccesosDeUsuario },
      preHandler: asignar,
      handler: controlador.reemplazarAccesos,
    });
    app.get(`${RUTA}/:bodegaId/usuarios`, {
      schema: { tags: etiquetas, params: esquemaParamsBodega },
      preHandler: asignar,
      handler: controlador.usuariosDeBodega,
    });
  };
}
