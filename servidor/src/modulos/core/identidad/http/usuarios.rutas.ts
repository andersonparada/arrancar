import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../http/guardias.js';
import type { UsuariosControlador } from './usuarios.controlador.js';
import {
  esquemaCambioContrasena,
  esquemaCambioUsuario,
  esquemaNuevoUsuario,
  esquemaParamsUsuario,
  esquemaSugerenciaUsuario,
} from './usuarios.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const tags = ['Usuarios'];

function rutasDeAlta(app: Aplicacion, usuarios: UsuariosControlador): void {
  const gestionar = proteger({ permiso: 'usuarios.gestionar' });
  app.get('/usuarios/sugerencia', {
    schema: { tags, querystring: esquemaSugerenciaUsuario },
    preHandler: gestionar,
    handler: usuarios.sugerirNombre,
  });
  app.post('/usuarios', {
    schema: { tags, body: esquemaNuevoUsuario },
    preHandler: gestionar,
    handler: usuarios.crear,
  });
}

function rutasDeCambio(app: Aplicacion, usuarios: UsuariosControlador): void {
  const gestionar = proteger({ permiso: 'usuarios.gestionar' });
  app.patch('/usuarios/:usuarioId', {
    schema: { tags, params: esquemaParamsUsuario, body: esquemaCambioUsuario },
    preHandler: gestionar,
    handler: usuarios.actualizar,
  });
  app.put('/usuarios/:usuarioId/contrasena', {
    schema: { tags, params: esquemaParamsUsuario, body: esquemaCambioContrasena },
    preHandler: gestionar,
    handler: usuarios.cambiarContrasena,
  });
}

export function rutasUsuarios(usuarios: UsuariosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/usuarios', {
      schema: { tags },
      preHandler: proteger({ permiso: 'usuarios.ver' }),
      handler: usuarios.listar,
    });
    rutasDeAlta(app, usuarios);
    rutasDeCambio(app, usuarios);
  };
}
