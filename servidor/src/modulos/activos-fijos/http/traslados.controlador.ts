import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularTraslado } from '../aplicacion/casos-uso/traslados/anular-traslado.js';
import type { ObtenerBoleta } from '../aplicacion/casos-uso/traslados/obtener-boleta.js';
import type { TrasladarActivos } from '../aplicacion/casos-uso/traslados/trasladar-activos.js';
import type { AnulacionDeTrasladoSolicitada, ParamsBoleta, TrasladoSolicitado } from './traslados.esquemas-http.js';

export interface CasosDeUsoDeTraslados {
  trasladar: TrasladarActivos;
  anular: AnularTraslado;
  obtenerBoleta: ObtenerBoleta;
}

/** Traduce las peticiones HTTP de los traslados a casos de uso; no contiene reglas de negocio. */
export class TrasladosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeTraslados) {}

  trasladar = async (solicitud: FastifyRequest<{ Body: TrasladoSolicitado }>, respuesta: FastifyReply) => {
    const boleta = await this.casosDeUso.trasladar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(boleta);
  };

  anular = (solicitud: FastifyRequest<{ Params: ParamsBoleta; Body: AnulacionDeTrasladoSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), {
      grupoId: solicitud.params.grupoId,
      motivo: solicitud.body.motivo,
    });

  obtenerBoleta = (solicitud: FastifyRequest<{ Params: ParamsBoleta }>) =>
    this.casosDeUso.obtenerBoleta.ejecutar(operadorDe(solicitud), solicitud.params.grupoId);
}
