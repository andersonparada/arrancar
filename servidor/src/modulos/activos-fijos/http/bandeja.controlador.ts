import type { FastifyReply, FastifyRequest } from 'fastify';
import { aCentavos } from '../../core/compartido/dominio/centavos.js';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { DescartarLinea } from '../aplicacion/casos-uso/bandeja/descartar-linea.js';
import type { DevolverLineaALaBandeja } from '../aplicacion/casos-uso/bandeja/devolver-linea.js';
import type { ListarBandeja } from '../aplicacion/casos-uso/bandeja/listar-bandeja.js';
import type { CapitalizarLineas } from '../aplicacion/casos-uso/costos/capitalizar-lineas.js';
import type { SolicitudDeCapitalizacion } from '../aplicacion/dto/capitalizacion.dto.js';
import type {
  CapitalizacionSolicitada,
  DescarteSolicitado,
  FiltrosDeBandejaSolicitados,
  ParamsLinea,
} from './bandeja.esquemas-http.js';

export interface CasosDeUsoDeBandeja {
  listar: ListarBandeja;
  capitalizar: CapitalizarLineas;
  descartar: DescartarLinea;
  devolver: DevolverLineaALaBandeja;
}

/** El monto llega como texto con dos decimales y los casos de uso trabajan en centavos enteros. */
function aSolicitud({ asignaciones }: CapitalizacionSolicitada): SolicitudDeCapitalizacion {
  return { asignaciones: asignaciones.map(({ monto, ...resto }) => ({ ...resto, montoCentavos: aCentavos(monto) })) };
}

/** Traduce las peticiones HTTP de la bandeja a casos de uso; no contiene reglas de negocio. */
export class BandejaControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeBandeja) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltrosDeBandejaSolicitados }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  capitalizar = async (solicitud: FastifyRequest<{ Body: CapitalizacionSolicitada }>, respuesta: FastifyReply) => {
    const resultado = await this.casosDeUso.capitalizar.ejecutar(operadorDe(solicitud), aSolicitud(solicitud.body));
    return respuesta.status(201).send(resultado);
  };

  descartar = (solicitud: FastifyRequest<{ Params: ParamsLinea; Body: DescarteSolicitado }>) =>
    this.casosDeUso.descartar.ejecutar(operadorDe(solicitud), {
      lineaId: solicitud.params.lineaId,
      motivo: solicitud.body.motivo,
    });

  devolver = async (solicitud: FastifyRequest<{ Params: ParamsLinea }>, respuesta: FastifyReply) => {
    await this.casosDeUso.devolver.ejecutar(operadorDe(solicitud), solicitud.params.lineaId);
    return respuesta.status(204).send();
  };
}
