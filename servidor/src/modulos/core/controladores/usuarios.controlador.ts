import type { FastifyReply, FastifyRequest } from 'fastify';
import { empresaActivaDe } from '../http/contexto-solicitud.js';
import { usuariosServicio, type Administrador } from '../servicios/usuarios.servicio.js';
import type {
  CambioContrasena,
  CambioUsuario,
  NuevoUsuarioSolicitado,
  ParamsUsuario,
  SugerenciaUsuario,
} from '../validaciones/usuarios.validaciones.js';

function administradorDe(solicitud: FastifyRequest): Administrador {
  const { usuarioId, cuentaId } = empresaActivaDe(solicitud);
  return { usuarioId, cuentaId };
}

export const usuariosControlador = {
  listar(solicitud: FastifyRequest) {
    return usuariosServicio.listar(empresaActivaDe(solicitud).cuentaId);
  },

  sugerirUsuario(solicitud: FastifyRequest<{ Querystring: SugerenciaUsuario }>) {
    return usuariosServicio.sugerirUsuario(solicitud.query.nombres, solicitud.query.apellidos);
  },

  async crear(solicitud: FastifyRequest<{ Body: NuevoUsuarioSolicitado }>, respuesta: FastifyReply) {
    const creado = await usuariosServicio.crear(administradorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(creado);
  },

  async actualizar(solicitud: FastifyRequest<{ Params: ParamsUsuario; Body: CambioUsuario }>, respuesta: FastifyReply) {
    await usuariosServicio.actualizar(administradorDe(solicitud), solicitud.params.usuarioId, solicitud.body);
    return respuesta.status(204).send();
  },

  async cambiarContrasena(
    solicitud: FastifyRequest<{ Params: ParamsUsuario; Body: CambioContrasena }>,
    respuesta: FastifyReply,
  ) {
    await usuariosServicio.cambiarContrasena(
      administradorDe(solicitud),
      solicitud.params.usuarioId,
      solicitud.body.contrasena,
    );
    return respuesta.status(204).send();
  },
};
