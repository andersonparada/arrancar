import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { usuariosControlador } from '../controladores/usuarios.controlador.js';
import { proteger } from '../http/guardias.js';
import {
  esquemaCambioContrasena,
  esquemaCambioUsuario,
  esquemaNuevoUsuario,
  esquemaParamsUsuario,
  esquemaSugerenciaUsuario,
} from '../validaciones/usuarios.validaciones.js';

export const rutasUsuarios: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Usuarios'];

  app.get('/usuarios', {
    schema: { tags },
    preHandler: proteger({ permiso: 'usuarios.ver' }),
    handler: usuariosControlador.listar,
  });

  app.get('/usuarios/sugerencia', {
    schema: { tags, querystring: esquemaSugerenciaUsuario },
    preHandler: proteger({ permiso: 'usuarios.gestionar' }),
    handler: usuariosControlador.sugerirUsuario,
  });

  app.post('/usuarios', {
    schema: { tags, body: esquemaNuevoUsuario },
    preHandler: proteger({ permiso: 'usuarios.gestionar' }),
    handler: usuariosControlador.crear,
  });

  app.patch('/usuarios/:usuarioId', {
    schema: { tags, params: esquemaParamsUsuario, body: esquemaCambioUsuario },
    preHandler: proteger({ permiso: 'usuarios.gestionar' }),
    handler: usuariosControlador.actualizar,
  });

  app.put('/usuarios/:usuarioId/contrasena', {
    schema: { tags, params: esquemaParamsUsuario, body: esquemaCambioContrasena },
    preHandler: proteger({ permiso: 'usuarios.gestionar' }),
    handler: usuariosControlador.cambiarContrasena,
  });
};
