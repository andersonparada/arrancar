import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import { PERMISO_SIN_BANCARIZAR, type PagosEnEfectivoControlador } from './pagos-en-efectivo.controlador.js';
import {
  esquemaPagosEnEfectivo,
  esquemaParamsDeRetiroConPagos,
  type PagosEnEfectivoSolicitados,
} from './pagos-en-efectivo.esquemas-http.js';

const tags = ['Cuentas por pagar'];

/**
 * Saldar una diferencia de centavos al pagar además pide `ajustes.crear`, y escribir el motivo de la excepción de
 * bancarización, `pagos.efectivo-sin-bancarizar` (sin el permiso el motivo no se acepta, lo pida o no la regla).
 */
async function exigirLosPermisosDelCuerpo(solicitud: FastifyRequest<{ Body: PagosEnEfectivoSolicitados }>) {
  const pagos = solicitud.body?.pagos ?? [];
  const pide = (permiso: string, cuando: (pago: (typeof pagos)[number]) => boolean) =>
    pagos.some(cuando) && !solicitud.contexto?.permisos.has(permiso);
  if (pide('cuentas-por-pagar.ajustes.crear', ({ diferencias }) => (diferencias?.length ?? 0) > 0)) {
    throw new AccesoDenegado();
  }
  if (pide(PERMISO_SIN_BANCARIZAR, ({ motivoSinBancarizar }) => Boolean(motivoSinBancarizar))) {
    throw new AccesoDenegado();
  }
}

/** Repartir el efectivo de un retiro entre uno o varios proveedores (`pagos.pagar-en-efectivo`). */
export function rutasDePagosEnEfectivo(controlador: PagosEnEfectivoControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.post('/cuentas-por-pagar/retiros/:id/pagos', {
      schema: { tags, params: esquemaParamsDeRetiroConPagos, body: esquemaPagosEnEfectivo },
      preHandler: [proteger({ permiso: 'cuentas-por-pagar.pagos.pagar-en-efectivo' }), exigirLosPermisosDelCuerpo],
      handler: controlador.repartir,
    });
  };
}
