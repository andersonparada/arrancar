import type { FastifyReply, FastifyRequest } from 'fastify';
import { borrarCookieSesion, escribirCookieSesion, leerCookieSesion } from '../http/cookie-sesion.js';
import { contextoDe } from '../http/contexto-solicitud.js';
import { autenticacionServicio } from '../servicios/autenticacion.servicio.js';
import { sesionServicio } from '../servicios/sesion.servicio.js';
import type { CambioEmpresa, InicioSesion } from '../validaciones/autenticacion.validaciones.js';

export const autenticacionControlador = {
  async iniciarSesion(solicitud: FastifyRequest<{ Body: InicioSesion }>, respuesta: FastifyReply) {
    const { token, expiraEn } = await autenticacionServicio.iniciarSesion({
      usuario: solicitud.body.usuario,
      contrasena: solicitud.body.contrasena,
      direccionIp: solicitud.ip,
      agenteUsuario: solicitud.headers['user-agent'] ?? null,
    });
    escribirCookieSesion(respuesta, token, expiraEn);
    return respuesta.status(204).send();
  },

  async cerrarSesion(solicitud: FastifyRequest, respuesta: FastifyReply) {
    const token = leerCookieSesion(solicitud);
    if (token) await autenticacionServicio.cerrarSesion(token);
    borrarCookieSesion(respuesta);
    return respuesta.status(204).send();
  },

  async obtenerSesion(solicitud: FastifyRequest) {
    return sesionServicio.obtenerResumen(contextoDe(solicitud), solicitud.ip);
  },

  async cambiarEmpresaActiva(solicitud: FastifyRequest<{ Body: CambioEmpresa }>) {
    const contexto = await sesionServicio.cambiarEmpresaActiva(
      contextoDe(solicitud),
      solicitud.body.empresaId,
      solicitud.ip,
    );
    return sesionServicio.obtenerResumen(contexto, solicitud.ip);
  },
};
