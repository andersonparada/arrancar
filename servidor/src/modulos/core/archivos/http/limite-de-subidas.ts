import type { FastifyInstance } from 'fastify';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import { DemasiadasSubidas } from '../dominio/imagen.js';

/** Constante de seguridad, no configurable: subir y optimizar archivos es pesado. */
const SUBIDAS_POR_MINUTO = 30;

/**
 * Guardia que limita las subidas de archivos por usuario de la sesión. Va después de la
 * cadena de guardias (`proteger`), porque necesita saber quién es el usuario.
 */
export function limitarSubidas(app: FastifyInstance) {
  return app.rateLimit({
    max: SUBIDAS_POR_MINUTO,
    timeWindow: '1 minute',
    keyGenerator: (solicitud) => `subir:${contextoDe(solicitud).usuario.id}`,
    errorResponseBuilder: () => new DemasiadasSubidas(),
  });
}
