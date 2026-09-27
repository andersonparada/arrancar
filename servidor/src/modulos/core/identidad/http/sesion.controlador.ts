import type { FastifyReply, FastifyRequest } from 'fastify';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import { borrarCookieSesion, escribirCookieSesion, leerCookieSesion } from '../../compartido/http/cookie-de-sesion.js';
import type { CambiarEmpresaActiva } from '../aplicacion/casos-uso/cambiar-empresa-activa.js';
import type { CerrarSesion } from '../aplicacion/casos-uso/cerrar-sesion.js';
import type { IniciarSesion } from '../aplicacion/casos-uso/iniciar-sesion.js';
import type { ObtenerResumenDeSesion } from '../aplicacion/casos-uso/obtener-resumen-de-sesion.js';
import type { CambioEmpresa, InicioSesion } from './sesion.esquemas-http.js';

export interface CasosDeUsoDeSesion {
  iniciar: IniciarSesion;
  cerrar: CerrarSesion;
  obtenerResumen: ObtenerResumenDeSesion;
  cambiarEmpresa: CambiarEmpresaActiva;
}

/** El token viaja solo en una cookie HttpOnly; el navegador nunca lo ve. */
export class SesionControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeSesion) {}

  iniciar = async (solicitud: FastifyRequest<{ Body: InicioSesion }>, respuesta: FastifyReply) => {
    const { token, expiraEn } = await this.casosDeUso.iniciar.ejecutar({
      ...solicitud.body,
      direccionIp: solicitud.ip,
      agenteUsuario: solicitud.headers['user-agent'] ?? null,
    });
    escribirCookieSesion(respuesta, token, expiraEn);
    return respuesta.status(204).send();
  };

  cerrar = async (solicitud: FastifyRequest, respuesta: FastifyReply) => {
    const token = leerCookieSesion(solicitud);
    if (token) await this.casosDeUso.cerrar.ejecutar(token);
    borrarCookieSesion(respuesta);
    return respuesta.status(204).send();
  };

  obtenerResumen = (solicitud: FastifyRequest) =>
    this.casosDeUso.obtenerResumen.ejecutar(contextoDe(solicitud), solicitud.ip);

  cambiarEmpresa = async (solicitud: FastifyRequest<{ Body: CambioEmpresa }>) => {
    const contexto = await this.casosDeUso.cambiarEmpresa.ejecutar(contextoDe(solicitud), {
      empresaId: solicitud.body.empresaId,
      direccionIp: solicitud.ip,
    });
    return this.casosDeUso.obtenerResumen.ejecutar(contexto, solicitud.ip);
  };
}
