import type { FastifyReply, FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { AnularRetiro } from '../aplicacion/casos-uso/retiros/anular-retiro.js';
import type { ListarRetiros, ObtenerRetiro } from '../aplicacion/casos-uso/retiros/consultas-de-retiros.js';
import type { LiquidarRetiro } from '../aplicacion/casos-uso/retiros/liquidar-retiro.js';
import type { ReabrirRetiro } from '../aplicacion/casos-uso/retiros/reabrir-retiro.js';
import type { RegistrarRetiroDeEfectivo } from '../aplicacion/casos-uso/retiros/registrar-retiro-de-efectivo.js';
import type {
  CambiarRetiroSolicitado,
  LiquidarRetiroSolicitado,
  ListaDeRetirosSolicitada,
  ParamsDeRetiro,
  RetiroSolicitado,
} from './retiros.esquemas-http.js';

export interface CasosDeUsoDeRetiros {
  registrar: RegistrarRetiroDeEfectivo;
  listar: ListarRetiros;
  obtener: ObtenerRetiro;
  liquidar: LiquidarRetiro;
  reabrir: ReabrirRetiro;
  anular: AnularRetiro;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class RetirosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeRetiros) {}

  registrar = async (solicitud: FastifyRequest<{ Body: RetiroSolicitado }>, respuesta: FastifyReply) => {
    const retiro = await this.casosDeUso.registrar.ejecutar(operadorDe(solicitud), solicitud.body);
    return respuesta.status(201).send(retiro);
  };

  listar = (solicitud: FastifyRequest<{ Querystring: ListaDeRetirosSolicitada }>) =>
    this.casosDeUso.listar.ejecutar(operadorDe(solicitud), solicitud.query);

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeRetiro }>) =>
    this.casosDeUso.obtener.ejecutar(operadorDe(solicitud), solicitud.params.id);

  liquidar = (solicitud: FastifyRequest<{ Params: ParamsDeRetiro; Body: LiquidarRetiroSolicitado }>) =>
    this.casosDeUso.liquidar.ejecutar(operadorDe(solicitud), { retiroId: solicitud.params.id, ...solicitud.body });

  reabrir = (solicitud: FastifyRequest<{ Params: ParamsDeRetiro; Body: CambiarRetiroSolicitado }>) =>
    this.casosDeUso.reabrir.ejecutar(operadorDe(solicitud), { retiroId: solicitud.params.id, ...solicitud.body });

  anular = (solicitud: FastifyRequest<{ Params: ParamsDeRetiro; Body: CambiarRetiroSolicitado }>) =>
    this.casosDeUso.anular.ejecutar(operadorDe(solicitud), { retiroId: solicitud.params.id, ...solicitud.body });
}
