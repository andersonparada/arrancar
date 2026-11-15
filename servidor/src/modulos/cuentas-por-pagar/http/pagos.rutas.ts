import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaParamsDeProveedor } from './documentos.esquemas-http.js';
import type { PagosControlador } from './pagos.controlador.js';
import {
  esquemaMedios,
  esquemaPago,
  esquemaParaPagar,
  esquemaProveedoresPorPagar,
  type PagoSolicitado,
} from './pagos.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar';

/** Saldar una diferencia de centavos al pagar además pide `ajustes.crear`. */
async function exigirAjustesSiHayDiferencias(solicitud: FastifyRequest<{ Body: PagoSolicitado }>): Promise<void> {
  const pide = (solicitud.body?.diferencias?.length ?? 0) > 0;
  if (pide && !solicitud.contexto?.permisos.has('cuentas-por-pagar.ajustes.crear')) throw new AccesoDenegado();
}

/**
 * Pagar con cheque o nota de débito (`pagos.emitir`, y `ajustes.crear` si trae diferencias) y lo que la ventana de pago
 * consulta (`pagos.ver`): proveedores por pagar, medios de pago y lo que se puede pagar de un proveedor.
 */
export function rutasDePagos(controlador: PagosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'cuentas-por-pagar.pagos.ver' });
    app.get(`${RUTA}/pagos/proveedores-por-pagar`, {
      schema: { tags, querystring: esquemaProveedoresPorPagar },
      preHandler: ver,
      handler: controlador.proveedoresPorPagar,
    });
    app.get(`${RUTA}/pagos/medios`, {
      schema: { tags, querystring: esquemaMedios },
      preHandler: ver,
      handler: controlador.medios,
    });
    app.get(`${RUTA}/proveedores/:proveedorId/para-pagar`, {
      schema: { tags, params: esquemaParamsDeProveedor, querystring: esquemaParaPagar },
      preHandler: ver,
      handler: controlador.paraPagar,
    });
    app.post(`${RUTA}/pagos`, {
      schema: { tags, body: esquemaPago },
      preHandler: [proteger({ permiso: 'cuentas-por-pagar.pagos.emitir' }), exigirAjustesSiHayDiferencias],
      handler: controlador.registrar,
    });
  };
}
