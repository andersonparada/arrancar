import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaEliminacion, esquemaParamsMovimiento } from './movimientos.esquemas-http.js';
import type { SaldosGlobalesControlador } from './saldos-globales.controlador.js';
import { esquemaSaldoGlobal } from './saldos-globales.esquemas-http.js';

const etiquetas = ['Bancos'];
const RUTA = '/bancos/saldos-iniciales';
const conId = { tags: etiquetas, params: esquemaParamsMovimiento };

/**
 * HEREDADO (hasta BS-5): las rutas que el cliente actual usa para el saldo inicial «de antes». El `GET` vive en
 * `/bancos/saldos-iniciales?cuentaBancariaId=…` (ver `saldos-iniciales.rutas.ts`); el `POST` conserva su ruta y el
 * `PUT` y el `DELETE` pasan a `/global/:movimientoId`, porque `/:cuentaBancariaId` es ahora de la ficha nueva.
 */
export function rutasDeSaldosGlobales(controlador: SaldosGlobalesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(RUTA, {
      schema: { tags: etiquetas, body: esquemaSaldoGlobal },
      preHandler: proteger({ permiso: 'bancos.saldos-iniciales.crear' }),
      handler: controlador.crear,
    });
    app.put(`${RUTA}/global/:movimientoId`, {
      schema: { ...conId, body: esquemaSaldoGlobal },
      preHandler: proteger({ permiso: 'bancos.saldos-iniciales.editar' }),
      handler: controlador.actualizar,
    });
    app.delete(`${RUTA}/global/:movimientoId`, {
      schema: { ...conId, body: esquemaEliminacion },
      preHandler: proteger({ permiso: 'bancos.saldos-iniciales.eliminar' }),
      handler: controlador.eliminar,
    });
  };
}
