import type { FastifyInstance } from 'fastify';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import { DemasiadasImportaciones } from '../aplicacion/errores.js';

/** Diez solicitudes por minuto por usuario (5 importaciones completas, cada una con su ensayo): son pesadas y tumbarlas afecta a todas las empresas. */
const SOLICITUDES_DE_IMPORTAR_POR_MINUTO = 10;

/**
 * Guardia que limita las importaciones por usuario de la sesión. Va después de la
 * cadena de guardias (`proteger`), porque necesita saber quién es el usuario.
 * El ensayo y la importación definitiva cuentan cada uno.
 */
export function limitarImportaciones(app: FastifyInstance) {
  return app.rateLimit({
    max: SOLICITUDES_DE_IMPORTAR_POR_MINUTO,
    timeWindow: '1 minute',
    keyGenerator: (solicitud) => `importar:${contextoDe(solicitud).usuario.id}`,
    errorResponseBuilder: () => new DemasiadasImportaciones(),
  });
}
