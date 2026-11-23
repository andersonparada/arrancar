import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ObtenerDatosFiscalesDeCliente } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-cliente.js';
import type { ParamsDeCliente } from './datos-fiscales-de-cliente.esquemas-http.js';

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class DatosFiscalesDeClienteControlador {
  constructor(private readonly obtenerDeCliente: ObtenerDatosFiscalesDeCliente) {}

  obtener = (solicitud: FastifyRequest<{ Params: ParamsDeCliente }>) =>
    this.obtenerDeCliente.ejecutar(operadorDe(solicitud), solicitud.params.clienteId);
}
