import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { AccesosALocalidadesControlador } from './accesos-a-localidades.controlador.js';
import { esquemaAccesosDeUsuario, esquemaParamsUsuarioDeAccesos } from './accesos-a-localidades.esquemas-http.js';
import { esquemaParamsLocalidad } from './localidades.esquemas-http.js';

const RUTA = '/empresas/localidades';
const etiquetas = ['Empresas'];
const conUsuario = { tags: etiquetas, params: esquemaParamsUsuarioDeAccesos };

/** La ventana de accesos: todas las rutas exigen `empresas.localidades.asignar`. */
export function rutasAccesosALocalidades(controlador: AccesosALocalidadesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const asignar = proteger({ permiso: 'empresas.localidades.asignar' });
    const sinParametros = { schema: { tags: etiquetas }, preHandler: asignar };

    app.get(`${RUTA}/accesos/localidades`, { ...sinParametros, handler: controlador.listarLocalidades });
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
    app.get(`${RUTA}/:localidadId/usuarios`, {
      schema: { tags: etiquetas, params: esquemaParamsLocalidad },
      preHandler: asignar,
      handler: controlador.usuariosDeLocalidad,
    });
  };
}
