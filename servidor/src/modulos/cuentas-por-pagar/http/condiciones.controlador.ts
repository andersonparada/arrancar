import type { FastifyRequest } from 'fastify';
import { operadorDe } from '../../core/compartido/http/operador-de-la-solicitud.js';
import type { ObtenerCondicionesDeProveedor } from '../aplicacion/casos-uso/condiciones/obtener-condiciones-de-proveedor.js';
import type { ParamsDeProveedor } from './documentos.esquemas-http.js';

/** Traduce las peticiones HTTP a casos de uso; no contiene reglas de negocio. */
export class CondicionesControlador {
  constructor(private readonly obtener: ObtenerCondicionesDeProveedor) {}

  obtenerDeProveedor = (solicitud: FastifyRequest<{ Params: ParamsDeProveedor }>) =>
    this.obtener.ejecutar(operadorDe(solicitud), solicitud.params.proveedorId);
}
