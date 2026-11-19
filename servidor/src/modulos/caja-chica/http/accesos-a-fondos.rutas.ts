import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { AccesosAFondosControlador } from './accesos-a-fondos.controlador.js';
import { esquemaAccesosDeUsuario, esquemaParamsUsuarioDeAccesos } from './accesos-a-fondos.esquemas-http.js';

const RUTA = '/caja-chica/accesos-a-fondos';
const etiquetas = ['Caja chica'];
const conUsuario = { tags: etiquetas, params: esquemaParamsUsuarioDeAccesos };

/** La ventana de accesos: todas las rutas exigen `caja-chica.fondos.asignar`. */
export function rutasAccesosAFondos(controlador: AccesosAFondosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const asignar = proteger({ permiso: 'caja-chica.fondos.asignar' });
    const sinParametros = { schema: { tags: etiquetas }, preHandler: asignar };

    app.get(`${RUTA}/fondos`, { ...sinParametros, handler: controlador.listarFondos });
    app.get(`${RUTA}/usuarios`, { ...sinParametros, handler: controlador.listarUsuarios });
    app.get(`${RUTA}/:usuarioId`, {
      schema: conUsuario,
      preHandler: asignar,
      handler: controlador.obtenerAccesos,
    });
    app.put(`${RUTA}/:usuarioId`, {
      schema: { ...conUsuario, body: esquemaAccesosDeUsuario },
      preHandler: asignar,
      handler: controlador.reemplazarAccesos,
    });
  };
}
