import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ConsultarConstanciasPendientes } from '../aplicacion/casos-uso/retenciones/consultar-constancias-pendientes.js';
import type { FiltroDeConstanciasPendientesSolicitado } from './constancias-pendientes.esquemas-http.js';

/** Traduce la petición HTTP al caso de uso; no contiene reglas de negocio. */
export class ConstanciasPendientesControlador {
  constructor(private readonly consulta: ConsultarConstanciasPendientes) {}

  listar = (solicitud: FastifyRequest<{ Querystring: FiltroDeConstanciasPendientesSolicitado }>) =>
    this.consulta.ejecutar(operadorDe(solicitud), solicitud.query);
}
