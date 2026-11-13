import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AjustarSaldo } from '../aplicacion/casos-uso/ajustes/ajustar-saldo.js';
import type { AnularAjuste } from '../aplicacion/casos-uso/ajustes/anular-ajuste.js';
import type { AjustarSaldoSolicitado, AnularAjusteSolicitado, ParamsDeAjuste } from './ajustes.esquemas-http.js';
import type { ParamsDeDocumento } from './documentos.esquemas-http.js';

export interface CasosDeUsoDeAjustes {
  ajustar: AjustarSaldo;
  anular: AnularAjuste;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class AjustesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeAjustes) {}

  ajustar = async (
    solicitud: FastifyRequest<{ Params: ParamsDeDocumento; Body: AjustarSaldoSolicitado }>,
    respuesta: FastifyReply,
  ) => {
    const ficha = await this.casosDeUso.ajustar.ejecutar(operadorDe(solicitud), {
      notaId: solicitud.params.documentoId,
      ...solicitud.body,
    });
    return respuesta.status(201).send(ficha);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeAjuste; Body: AnularAjusteSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      ajusteId: solicitud.params.ajusteId,
      motivo: solicitud.body.motivo,
    });
}
