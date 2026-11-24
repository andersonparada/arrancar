import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularTraslado } from '../aplicacion/casos-uso/traslados/anular-traslado.js';
import type { ListarDestinos } from '../aplicacion/casos-uso/traslados/listar-destinos.js';
import type { ObtenerBoleta } from '../aplicacion/casos-uso/traslados/obtener-boleta.js';
import type { RecibirTraslado } from '../aplicacion/casos-uso/traslados/recibir-traslado.js';
import type { TrasladarArticulos } from '../aplicacion/casos-uso/traslados/trasladar-articulos.js';
import type { AnulacionSolicitada, ParamsDocumento } from './movimientos.esquemas-http.js';
import type { RecepcionDeTrasladoSolicitada, TrasladoSolicitado } from './traslados.esquemas-http.js';
import { vistaDe } from './vista-de-la-solicitud.js';

export interface CasosDeUsoDeTraslados {
  trasladar: TrasladarArticulos;
  recibir: RecibirTraslado;
  anular: AnularTraslado;
  boleta: ObtenerBoleta;
  destinos: ListarDestinos;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class TrasladosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeTraslados) {}

  trasladar = async (solicitud: FastifyRequest<{ Body: TrasladoSolicitado }>, respuesta: FastifyReply) => {
    const traslado = await this.casosDeUso.trasladar.ejecutar(
      operadorDe(solicitud),
      solicitud.body,
      vistaDe(solicitud),
    );
    return respuesta.status(201).send(traslado);
  };

  recibir = (solicitud: FastifyRequest<{ Params: ParamsDocumento; Body: RecepcionDeTrasladoSolicitada }>) =>
    this.casosDeUso.recibir.ejecutar(
      operadorDe(solicitud),
      { documentoId: solicitud.params.documentoId, ...solicitud.body },
      vistaDe(solicitud),
    );

  anular = (solicitud: FastifyRequest<{ Params: ParamsDocumento; Body: AnulacionSolicitada }>) =>
    this.casosDeUso.anular.ejecutar(
      operadorDe(solicitud),
      { documentoId: solicitud.params.documentoId, motivo: solicitud.body.motivo },
      vistaDe(solicitud),
    );

  boleta = (solicitud: FastifyRequest<{ Params: ParamsDocumento }>) =>
    this.casosDeUso.boleta.ejecutar(operadorDe(solicitud), solicitud.params.documentoId);

  destinos = (solicitud: FastifyRequest) => this.casosDeUso.destinos.ejecutar(operadorDe(solicitud));
}
