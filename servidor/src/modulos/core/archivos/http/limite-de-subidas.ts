import type { FastifyInstance } from 'fastify';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import { DemasiadasSubidas } from '../dominio/imagen.js';

/** Constante de seguridad, no configurable: subir y optimizar archivos es pesado. */
const SUBIDAS_POR_MINUTO = 30;

/** Un solo manejador por aplicación: cada `app.rateLimit()` crea su propio contador y el límite sería por ruta. */
const manejadores = new WeakMap<object, ReturnType<FastifyInstance['rateLimit']>>();

/**
 * Guardia que limita las subidas de archivos por usuario de la sesión, en común para todas las rutas que
 * suben (fotos, estados de cuenta…). Va después de la cadena de guardias (`proteger`), porque necesita saber
 * quién es el usuario.
 */
export function limitarSubidas(app: FastifyInstance) {
  const existente = manejadores.get(app.rateLimit);
  if (existente) return existente;
  const nuevo = app.rateLimit({
    max: SUBIDAS_POR_MINUTO,
    timeWindow: '1 minute',
    keyGenerator: (solicitud) => `subir:${contextoDe(solicitud).usuario.id}`,
    errorResponseBuilder: () => new DemasiadasSubidas(),
  });
  manejadores.set(app.rateLimit, nuevo);
  return nuevo;
}
