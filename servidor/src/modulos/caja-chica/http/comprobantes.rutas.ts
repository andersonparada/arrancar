import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ComprobantesControlador } from './comprobantes.controlador.js';
import {
  esquemaAsignarDocumentos,
  esquemaBandeja,
  esquemaComprobantesDelFondo,
  esquemaConMotivo,
  esquemaParamsDeComprobante,
  esquemaValeDeGasto,
} from './comprobantes.esquemas-http.js';
import { esquemaParamsDeFondo } from './fondos.esquemas-http.js';

const tags = ['Caja chica'];
const RUTA = '/caja-chica';

/**
 * Los comprobantes: la bandeja y los de un fondo (`fondos.ver`), asignar documentos, devolverlos a la bandeja y registrar
 * vales de gasto (`comprobantes.crear`; las excepciones de tope y retención piden además su permiso, que revisa el caso de
 * uso) y anular un vale (`comprobantes.anular`).
 */
export function rutasDeComprobantes(controlador: ComprobantesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    consultas(app, controlador);
    altas(app, controlador);
    bajas(app, controlador);
  };
}

function consultas(app: FastifyInstance, controlador: ComprobantesControlador): void {
  const ver = proteger({ permiso: 'caja-chica.fondos.ver' });
  app.get(`${RUTA}/bandeja`, {
    schema: { tags, querystring: esquemaBandeja },
    preHandler: ver,
    handler: controlador.bandeja,
  });
  app.get(`${RUTA}/fondos/:id/comprobantes`, {
    schema: { tags, params: esquemaParamsDeFondo, querystring: esquemaComprobantesDelFondo },
    preHandler: ver,
    handler: controlador.delFondo,
  });
}

function altas(app: FastifyInstance, controlador: ComprobantesControlador): void {
  const params = esquemaParamsDeFondo;
  const crear = proteger({ permiso: 'caja-chica.comprobantes.crear' });
  app.post(`${RUTA}/fondos/:id/comprobantes/documentos`, {
    schema: { tags, params, body: esquemaAsignarDocumentos },
    preHandler: crear,
    handler: controlador.asignar,
  });
  app.post(`${RUTA}/fondos/:id/vales-de-gasto`, {
    schema: { tags, params, body: esquemaValeDeGasto },
    preHandler: crear,
    handler: controlador.registrarVale,
  });
}

function bajas(app: FastifyInstance, controlador: ComprobantesControlador): void {
  const params = esquemaParamsDeComprobante;
  app.post(`${RUTA}/comprobantes/:id/devolver-a-la-bandeja`, {
    schema: { tags, params, body: esquemaConMotivo },
    preHandler: proteger({ permiso: 'caja-chica.comprobantes.crear' }),
    handler: controlador.devolver,
  });
  app.post(`${RUTA}/comprobantes/:id/anular`, {
    schema: { tags, params, body: esquemaConMotivo },
    preHandler: proteger({ permiso: 'caja-chica.comprobantes.anular' }),
    handler: controlador.anular,
  });
}
