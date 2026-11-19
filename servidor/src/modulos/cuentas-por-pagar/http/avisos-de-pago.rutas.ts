import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import { DemasiadosAvisosDePago } from '../aplicacion/errores-de-avisos.js';
import type { AvisosDePagoControlador } from './avisos-de-pago.controlador.js';
import {
  esquemaCancelacionDeAviso,
  esquemaEnvioDeAviso,
  esquemaParamsDeAviso,
  esquemaParamsDeAvisoCorreo,
} from './avisos-de-pago.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar/pagos/:id/aviso';

/** Constante de seguridad, no configurable: cada envío genera un PDF y un correo real. */
const AVISOS_POR_MINUTO = 20;

/** Limita los envíos de aviso por usuario de la sesión. Va después de la cadena de guardias. */
function limitarAvisos(app: FastifyInstance) {
  return app.rateLimit({
    max: AVISOS_POR_MINUTO,
    timeWindow: '1 minute',
    keyGenerator: (solicitud) => `aviso-de-pago:${contextoDe(solicitud).usuario.id}`,
    errorResponseBuilder: () => new DemasiadosAvisosDePago(),
  });
}

/** Ver el aviso con `pagos.ver`; enviar, reenviar y cancelar con `pagos.enviar-aviso`. */
export function rutasDeAvisosDePago(controlador: AvisosDePagoControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const enviar = proteger({ permiso: 'cuentas-por-pagar.pagos.enviar-aviso' });
    app.get(RUTA, {
      schema: { tags, params: esquemaParamsDeAviso },
      preHandler: proteger({ permiso: 'cuentas-por-pagar.pagos.ver' }),
      handler: controlador.obtener,
    });
    app.post(RUTA, {
      schema: { tags, params: esquemaParamsDeAviso, body: esquemaEnvioDeAviso },
      preHandler: [enviar, limitarAvisos(app)],
      handler: controlador.enviar,
    });
    app.post(`${RUTA}/:correoId/cancelar`, {
      schema: { tags, params: esquemaParamsDeAvisoCorreo, body: esquemaCancelacionDeAviso },
      preHandler: enviar,
      handler: controlador.cancelar,
    });
  };
}
