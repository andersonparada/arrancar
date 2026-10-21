import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { CondicionesControlador } from './condiciones.controlador.js';
import { esquemaParamsDeProveedor } from './documentos.esquemas-http.js';

const tags = ['Cuentas por pagar'];

/**
 * Lectura de las condiciones de pago de un proveedor (días de crédito y desde qué fecha corren). Se guardan junto con el
 * formulario de Proveedores (`secciones` del cuerpo); el permiso para verlas es el de ver proveedores.
 */
export function rutasDeCondiciones(controlador: CondicionesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/cuentas-por-pagar/proveedores/:proveedorId/condiciones', {
      schema: { tags, params: esquemaParamsDeProveedor },
      preHandler: proteger({ modulo: 'cuentas-por-pagar', permiso: 'terceros.ver' }),
      handler: controlador.obtenerDeProveedor,
    });
  };
}
