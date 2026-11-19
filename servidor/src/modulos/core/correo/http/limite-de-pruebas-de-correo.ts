import type { FastifyInstance } from 'fastify';
import { contextoDe } from '../../compartido/http/contexto-de-la-solicitud.js';
import { DemasiadasPruebasDeCorreo } from '../dominio/demasiadas-pruebas-de-correo.js';

/** Constante de seguridad, no configurable: cada prueba manda un correo real desde el dominio de la instalación. */
const PRUEBAS_POR_HORA = 5;

/** Limita las pruebas de envío a 5 por hora por usuario de soporte. Va después de la cadena de guardias. */
export function limitarPruebasDeCorreo(app: FastifyInstance) {
  return app.rateLimit({
    max: PRUEBAS_POR_HORA,
    timeWindow: '1 hour',
    keyGenerator: (solicitud) => `prueba-de-correo:${contextoDe(solicitud).usuario.id}`,
    errorResponseBuilder: () => new DemasiadasPruebasDeCorreo(),
  });
}
