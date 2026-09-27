import type { FastifyReply, FastifyRequest } from 'fastify';
import { esProduccion } from '../../../../configuracion.js';

const NOMBRE_COOKIE = 'arrancar_sesion';

export function leerCookieSesion(solicitud: FastifyRequest): string | undefined {
  return solicitud.cookies[NOMBRE_COOKIE];
}

/** Cookie HttpOnly: el JavaScript del navegador nunca ve el token. */
export function escribirCookieSesion(respuesta: FastifyReply, token: string, expiraEn: Date): void {
  respuesta.setCookie(NOMBRE_COOKIE, token, {
    httpOnly: true,
    secure: esProduccion,
    sameSite: 'lax',
    path: '/',
    expires: expiraEn,
  });
}

export function borrarCookieSesion(respuesta: FastifyReply): void {
  respuesta.clearCookie(NOMBRE_COOKIE, { path: '/' });
}
