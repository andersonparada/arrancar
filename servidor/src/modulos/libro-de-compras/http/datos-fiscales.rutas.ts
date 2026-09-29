import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { DatosFiscalesControlador } from './datos-fiscales.controlador.js';
import { esquemaParamsDeEmpresa, esquemaParamsDeProveedor } from './datos-fiscales.esquemas-http.js';

const tags = ['Libro de compras'];

/**
 * Lectura de los datos fiscales que este módulo aporta a los formularios de Empresas y Proveedores. Se guardan
 * junto con esos formularios (`secciones` del cuerpo), no con rutas propias; el permiso para verlos es el de
 * ver la empresa o el proveedor.
 */
export function rutasDeDatosFiscales(controlador: DatosFiscalesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/libro-de-compras/empresas/:empresaId/datos-fiscales', {
      schema: { tags, params: esquemaParamsDeEmpresa },
      preHandler: proteger({ modulo: 'libro-de-compras', permiso: 'empresas.ver' }),
      handler: controlador.obtenerDeEmpresa,
    });
    app.get('/libro-de-compras/proveedores/:proveedorId/datos-fiscales', {
      schema: { tags, params: esquemaParamsDeProveedor },
      preHandler: proteger({ modulo: 'libro-de-compras', permiso: 'terceros.ver' }),
      handler: controlador.obtenerDeProveedor,
    });
  };
}
