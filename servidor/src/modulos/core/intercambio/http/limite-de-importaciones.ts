import type { FastifyInstance } from 'fastify';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import { DemasiadasImportaciones } from '../aplicacion/errores.js';

/** Cinco importaciones por minuto por usuario: cada una es pesada y tumbarla afecta a todas las empresas. */
const IMPORTACIONES_POR_MINUTO = 5;

/**
 * Guardia que limita las importaciones por usuario de la sesión. Va después de la
 * cadena de guardias (`proteger`), porque necesita saber quién es el usuario.
 * El ensayo y la importación definitiva cuentan cada uno.
 */
export function limitarImportaciones(app: FastifyInstance) {
  return app.rateLimit({
    max: IMPORTACIONES_POR_MINUTO,
    timeWindow: '1 minute',
    keyGenerator: (solicitud) => `importar:${contextoDe(solicitud).usuario.id}`,
    errorResponseBuilder: () => new DemasiadasImportaciones(),
  });
}
