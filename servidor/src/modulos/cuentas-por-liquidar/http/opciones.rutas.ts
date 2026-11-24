import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { FastifyRequest } from 'fastify';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { OpcionesControlador } from './opciones.controlador.js';

const tags = ['Cuentas por liquidar'];
const RUTA = '/cuentas-por-liquidar';
const esquemaDeMedios = z.object({ fecha: z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' }).optional() });

/** A quién se entrega lo piden quien entrega (`anticipos.crear`) y quien filtra la lista (`anticipos.ver`). */
async function soloQuienEligeBeneficiario(solicitud: FastifyRequest): Promise<void> {
  const permisos = solicitud.contexto?.permisos;
  const pueden = ['cuentas-por-liquidar.anticipos.crear', 'cuentas-por-liquidar.anticipos.ver'];
  if (!pueden.some((permiso) => permisos?.has(permiso))) throw new AccesoDenegado();
}

/**
 * Lo que las ventanas piden para llenar sus listas: las cuentas y chequeras de Bancos para entregar (`anticipos.crear`) y
 * para reembolsar (`anticipos.liquidar`), los conceptos de gasto para un gasto sin documento (`gastos.crear`) y los beneficiarios (terceros activos) para entregar
 * o filtrar. Así quien
 * usa Cuentas por liquidar no necesita permisos de Bancos ni del libro para escoger.
 */
export function rutasDeOpciones(controlador: OpcionesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(`${RUTA}/medios-para-entregar`, {
      schema: { tags, querystring: esquemaDeMedios },
      preHandler: proteger({ permiso: 'cuentas-por-liquidar.anticipos.crear' }),
      handler: controlador.medios,
    });
    app.get(`${RUTA}/medios-para-liquidar`, {
      schema: { tags, querystring: esquemaDeMedios },
      preHandler: proteger({ permiso: 'cuentas-por-liquidar.anticipos.liquidar' }),
      handler: controlador.medios,
    });
    app.get(`${RUTA}/beneficiarios`, {
      schema: { tags },
      preHandler: [proteger({ modulo: 'cuentas-por-liquidar' }), soloQuienEligeBeneficiario],
      handler: controlador.beneficiarios,
    });
    app.get(`${RUTA}/conceptos-de-gasto`, {
      schema: { tags },
      preHandler: proteger({ permiso: 'cuentas-por-liquidar.gastos.crear' }),
      handler: controlador.conceptos,
    });
  };
}
