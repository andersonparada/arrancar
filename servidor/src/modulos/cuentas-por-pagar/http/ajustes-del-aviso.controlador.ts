import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { GuardarAjustesDelAviso } from '../aplicacion/casos-uso/avisos-de-pago/guardar-ajustes-del-aviso.js';
import type { ObtenerAjustesDelAviso } from '../aplicacion/casos-uso/avisos-de-pago/obtener-ajustes-del-aviso.js';
import type { AjustesDelAvisoSolicitados } from './ajustes-del-aviso.esquemas-http.js';

export interface CasosDeUsoDeAjustesDelAviso {
  obtener: ObtenerAjustesDelAviso;
  guardar: GuardarAjustesDelAviso;
}

/** Traduce la pantalla «Avisos de pago» (ver y guardar los ajustes de la empresa) a casos de uso. */
export class AjustesDelAvisoControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeAjustesDelAviso) {}

  obtener = (solicitud: FastifyRequest) => this.casosDeUso.obtener.ejecutar(operadorDe(solicitud));

  guardar = (solicitud: FastifyRequest<{ Body: AjustesDelAvisoSolicitados }>) =>
    this.casosDeUso.guardar.ejecutar(operadorDe(solicitud), solicitud.body);
}
