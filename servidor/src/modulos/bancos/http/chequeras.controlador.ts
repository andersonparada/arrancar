import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { CambiarEstadoDeChequera } from '../aplicacion/casos-uso/chequeras/cambiar-estado-de-chequera.js';
import type { CrearChequera } from '../aplicacion/casos-uso/chequeras/crear-chequera.js';
import type { ListarChequeras } from '../aplicacion/casos-uso/chequeras/listar-chequeras.js';
import type { ListarChequerasDeLaEmpresa } from '../aplicacion/casos-uso/chequeras/listar-chequeras-de-la-empresa.js';
import type { ListarCheques } from '../aplicacion/casos-uso/cheques/listar-cheques.js';
import type {
  ChequeraSolicitada,
  ParamsChequera,
  ParamsCuentaBancariaDeChequeras,
  FiltroDeChequesSolicitado,
  FiltroDeChequerasSolicitado,
} from './chequeras.esquemas-http.js';

export interface CasosDeUsoDeChequeras {
  listar: ListarChequeras;
  listarTodas: ListarChequerasDeLaEmpresa;
  crear: CrearChequera;
  cambiarEstado: CambiarEstadoDeChequera;
  listarCheques: ListarCheques;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class ChequerasControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeChequeras) {}

  listar = (solicitud: FastifyRequest<{ Params: ParamsCuentaBancariaDeChequeras }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.params.cuentaBancariaId);

  listarTodas = (solicitud: FastifyRequest<{ Querystring: FiltroDeChequerasSolicitado }>) =>
    this.casosDeUso.listarTodas.ejecutar(operadorDe(solicitud), solicitud.query);

  crear = async (
    solicitud: FastifyRequest<{ Params: ParamsCuentaBancariaDeChequeras; Body: ChequeraSolicitada }>,
    respuesta: FastifyReply,
  ) => {
    const chequera = await this.casosDeUso.crear.ejecutar(operadorDe(solicitud), {
      ...solicitud.body,
      cuentaBancariaId: solicitud.params.cuentaBancariaId,
    });
    return respuesta.status(201).send(chequera);
  };

  inactivar = (solicitud: FastifyRequest<{ Params: ParamsChequera }>) =>
    this.casosDeUso.cambiarEstado.ejecutar(operadorDe(solicitud), {
      chequeraId: solicitud.params.chequeraId,
      activa: false,
    });

  reactivar = (solicitud: FastifyRequest<{ Params: ParamsChequera }>) =>
    this.casosDeUso.cambiarEstado.ejecutar(operadorDe(solicitud), {
      chequeraId: solicitud.params.chequeraId,
      activa: true,
    });

  listarCheques = (solicitud: FastifyRequest<{ Params: ParamsChequera; Querystring: FiltroDeChequesSolicitado }>) =>
    this.casosDeUso.listarCheques.ejecutar(operadorDe(solicitud), {
      chequeraId: solicitud.params.chequeraId,
      estado: solicitud.query.estado,
    });
}
