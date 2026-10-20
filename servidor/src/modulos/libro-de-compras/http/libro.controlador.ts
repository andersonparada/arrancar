import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ConsultarAnuladosDelLibro, ConsultarLibro } from '../aplicacion/casos-uso/libro/consultar-libro.js';
import type { ConsultaDelLibroSolicitada } from './libro.esquemas-http.js';

export interface CasosDeUsoDelLibro {
  consultar: ConsultarLibro;
  anulados: ConsultarAnuladosDelLibro;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class LibroControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDelLibro) {}

  consultar = (solicitud: FastifyRequest<{ Querystring: ConsultaDelLibroSolicitada }>) =>
    this.casosDeUso.consultar.ejecutar(operadorDe(solicitud), solicitud.query.periodo);

  anulados = (solicitud: FastifyRequest<{ Querystring: ConsultaDelLibroSolicitada }>) =>
    this.casosDeUso.anulados.ejecutar(operadorDe(solicitud), solicitud.query.periodo);
}
