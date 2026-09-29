import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ObtenerDatosFiscalesDeEmpresa } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-empresa.js';
import type { ObtenerDatosFiscalesDeProveedor } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-proveedor.js';
import type { ParamsDeEmpresa, ParamsDeProveedor } from './datos-fiscales.esquemas-http.js';

export interface CasosDeUsoDeDatosFiscales {
  obtenerDeEmpresa: ObtenerDatosFiscalesDeEmpresa;
  obtenerDeProveedor: ObtenerDatosFiscalesDeProveedor;
}

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class DatosFiscalesControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeDatosFiscales) {}

  obtenerDeEmpresa = (solicitud: FastifyRequest<{ Params: ParamsDeEmpresa }>) =>
    this.casosDeUso.obtenerDeEmpresa.ejecutar(operadorDe(solicitud), solicitud.params.empresaId);

  obtenerDeProveedor = (solicitud: FastifyRequest<{ Params: ParamsDeProveedor }>) =>
    this.casosDeUso.obtenerDeProveedor.ejecutar(operadorDe(solicitud), solicitud.params.proveedorId);
}
