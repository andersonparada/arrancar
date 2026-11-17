import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { RegistrarPagosEnEfectivo } from '../aplicacion/casos-uso/efectivo/registrar-pagos-en-efectivo.js';
import type { PagosEnEfectivoSolicitados, ParamsDeRetiroConPagos } from './pagos-en-efectivo.esquemas-http.js';

/** El permiso de la excepción de bancarización: el controlador solo lo lee para decirle al caso de uso si puede usarla. */
export const PERMISO_SIN_BANCARIZAR = 'cuentas-por-pagar.pagos.efectivo-sin-bancarizar';

export interface CasosDeUsoDePagosEnEfectivo {
  repartir: RegistrarPagosEnEfectivo;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class PagosEnEfectivoControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDePagosEnEfectivo) {}

  repartir = async (
    solicitud: FastifyRequest<{ Params: ParamsDeRetiroConPagos; Body: PagosEnEfectivoSolicitados }>,
    respuesta: FastifyReply,
  ) => {
    const puedeSinBancarizar = solicitud.contexto?.permisos.has(PERMISO_SIN_BANCARIZAR) ?? false;
    const reparto = await this.casosDeUso.repartir.ejecutar(operadorDe(solicitud), {
      retiroId: solicitud.params.id,
      pagos: solicitud.body.pagos,
      puedeSinBancarizar,
    });
    return respuesta.status(201).send(reparto);
  };
}
