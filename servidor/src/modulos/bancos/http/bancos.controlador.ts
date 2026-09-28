import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ActualizarBanco } from '../aplicacion/casos-uso/bancos/actualizar-banco.js';
import type { CrearBanco } from '../aplicacion/casos-uso/bancos/crear-banco.js';
import type { ListarBancos } from '../aplicacion/casos-uso/bancos/listar-bancos.js';
import type { ObtenerBanco } from '../aplicacion/casos-uso/bancos/obtener-banco.js';
import type { BancoSolicitado, ParamsBanco } from './bancos.esquemas-http.js';

export interface CasosDeUsoDeBancos {
  listar: ListarBancos;
  obtener: ObtenerBanco;
  crear: CrearBanco;
  actualizar: ActualizarBanco;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class BancosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeBancos) {}

  listar = (solicitud: FastifyRequest) => this.casosDeUso.listar.ejecutar(operadorDe(solicitud));

  obtener = (solicitud: FastifyRequest<{ Params: ParamsBanco }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.bancoId);

  crear = async (solicitud: FastifyRequest<{ Body: BancoSolicitado }>, respuesta: FastifyReply) => {
    const banco = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(banco);
  };

  actualizar = (solicitud: FastifyRequest<{ Params: ParamsBanco; Body: BancoSolicitado }>) =>
    this.casosDeUso.actualizar.ejecutar(operadorDe(solicitud), {
      bancoId: solicitud.params.bancoId,
      solicitud: solicitud.body,
    });
}
