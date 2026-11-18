import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ListarPlazosDeProveedores } from '../aplicacion/casos-uso/condiciones/listar-plazos-de-proveedores.js';

/**
 * La lista de «Plazos de proveedores»: cada proveedor de la cuenta con sus días de crédito. Verla pide el permiso de
 * ver proveedores; llevársela a Excel pide el suyo aparte.
 */
export function rutasDeListaDePlazos(listar: ListarPlazosDeProveedores): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/cuentas-por-pagar/condiciones', {
      schema: { tags: ['Cuentas por pagar'] },
      preHandler: proteger({ modulo: 'cuentas-por-pagar', permiso: 'terceros.ver' }),
      handler: (solicitud) => listar.ejecutar(operadorDe(solicitud)),
    });
  };
}
