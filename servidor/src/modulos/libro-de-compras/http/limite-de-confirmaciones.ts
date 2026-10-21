import type { FastifyInstance } from 'fastify';
import { DemasiadasSolicitudes } from '../../core/compartido/dominio/errores.js';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';

/** Veinte solicitudes por minuto por usuario: cada una trae hasta 100 filas y cada fila es un registro completo. */
const SOLICITUDES_POR_MINUTO = 20;

/** Se pidieron demasiadas confirmaciones o vistas previas de la bandeja en poco tiempo (HTTP 429). */
export class DemasiadasConfirmacionesDeDte extends DemasiadasSolicitudes {
  readonly codigo = 'demasiadas_confirmaciones_de_dte';

  constructor() {
    super('Confirmó demasiados DTE en poco tiempo. Espere un minuto e intente de nuevo.');
  }
}

/**
 * Guardia que limita por usuario las confirmaciones y vistas previas de la bandeja. Va después de la cadena de guardias
 * (`proteger`), porque necesita saber quién es el usuario.
 */
export function limitarConfirmaciones(app: FastifyInstance) {
  return app.rateLimit({
    max: SOLICITUDES_POR_MINUTO,
    timeWindow: '1 minute',
    keyGenerator: (solicitud) => `confirmar-dte:${contextoDe(solicitud).usuario.id}`,
    errorResponseBuilder: () => new DemasiadasConfirmacionesDeDte(),
  });
}
