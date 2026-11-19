import type { FastifyInstance } from 'fastify';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import { DemasiadasMuestrasDelBanguat } from '../aplicacion/errores.js';

/** Constante de seguridad: cada muestra sale a un servicio externo. */
const MUESTRAS_POR_MINUTO = 10;

/** Guardia que limita las muestras del Banguat por usuario de la sesión; va después de `proteger`. */
export function limitarMuestras(app: FastifyInstance) {
  return app.rateLimit({
    max: MUESTRAS_POR_MINUTO,
    timeWindow: '1 minute',
    keyGenerator: (solicitud) => `muestra-banguat:${contextoDe(solicitud).usuario.id}`,
    errorResponseBuilder: () => new DemasiadasMuestrasDelBanguat(),
  });
}
