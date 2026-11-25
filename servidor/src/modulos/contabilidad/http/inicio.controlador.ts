import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { GuardarInicio } from '../aplicacion/casos-uso/inicio/guardar-inicio.js';
import type { ObtenerInicio } from '../aplicacion/casos-uso/inicio/obtener-inicio.js';
import type { InicioSolicitado } from './inicio.esquemas-http.js';

export interface CasosDeUsoDeInicio {
  obtener: ObtenerInicio;
  guardar: GuardarInicio;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class InicioControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeInicio) {}

  obtener = (solicitud: FastifyRequest) => this.casosDeUso.obtener.ejecutar(operadorDe(solicitud));

  guardar = (solicitud: FastifyRequest<{ Body: InicioSolicitado }>) =>
    this.casosDeUso.guardar.ejecutar(operadorDe(solicitud), solicitud.body);
}
