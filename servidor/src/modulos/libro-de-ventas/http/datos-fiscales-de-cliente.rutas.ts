import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { DatosFiscalesDeClienteControlador } from './datos-fiscales-de-cliente.controlador.js';
import { esquemaParamsDeCliente } from './datos-fiscales-de-cliente.esquemas-http.js';

/**
 * Lectura de los datos fiscales que este módulo aporta al formulario de Clientes. Se guardan junto con ese
 * formulario (`secciones` del cuerpo); el permiso para verlos es el de ver terceros.
 */
export function rutasDeDatosFiscalesDeCliente(controlador: DatosFiscalesDeClienteControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/libro-de-ventas/clientes/:clienteId/datos-fiscales', {
      schema: { tags: ['Libro de ventas'], params: esquemaParamsDeCliente },
      preHandler: proteger({ modulo: 'libro-de-ventas', permiso: 'terceros.ver' }),
      handler: controlador.obtener,
    });
  };
}
