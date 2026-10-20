import type { FastifyInstance } from 'fastify';
import { DemasiadasSolicitudes } from '../../core/compartido/dominio/errores.js';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';

/** Se pidieron demasiados PDF del libro en poco tiempo (HTTP 429). */
export class DemasiadosPdfDelLibro extends DemasiadasSolicitudes {
  readonly codigo = 'demasiados_pdf_del_libro';

  constructor() {
    super('Pidió demasiados PDF del libro en poco tiempo. Espere un minuto e intente de nuevo.');
  }
}

/**
 * Guardia que limita por usuario cuántos PDF del libro puede pedir por minuto: dibujarlos ocupa el proceso. Va después
 * de la cadena de guardias (`proteger`), porque necesita saber quién es el usuario.
 */
export function limitarPdfs(app: FastifyInstance, { clave, maximo }: { clave: string; maximo: number }) {
  return app.rateLimit({
    max: maximo,
    timeWindow: '1 minute',
    keyGenerator: (solicitud) => `libro-pdf-${clave}:${contextoDe(solicitud).usuario.id}`,
    errorResponseBuilder: () => new DemasiadosPdfDelLibro(),
  });
}
